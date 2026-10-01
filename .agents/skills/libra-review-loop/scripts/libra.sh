#!/usr/bin/env bash
# Helpers for driving an elastic/kibana PR through Libra review rounds.
#
# Usage:
#   bash .agents/skills/libra-review-loop/scripts/libra.sh wait <pr> [--sha <sha>] [--timeout <seconds>]
#   bash .agents/skills/libra-review-loop/scripts/libra.sh threads <pr>
#   bash .agents/skills/libra-review-loop/scripts/libra.sh resolve <thread-id>
#
# wait     Blocks until Libra finishes reviewing <sha> (default: the PR head commit) and prints:
#            libra=<clean|findings|skipped|error|none|timeout> sha=<sha> description="<status text>"
#          clean     Libra reviewed the commit and found nothing.
#          findings  Libra posted a review; run `threads` to read it.
#          skipped   Libra chose not to review this commit.
#          error     The Libra status ended in failure or error.
#          none      No Libra status appeared within 5 minutes of starting to wait.
#          timeout   Libra was still reviewing when --timeout (default 1200s) ran out.
# threads  Prints one JSON object per Libra thread that is unresolved and whose latest comment is
#          Libra's. followUp is true when Libra is answering a reply; otherReplies counts the
#          non-Libra comments in the thread, and latestCommentId/latestBody hold Libra's answer.
# resolve  Marks a review thread as resolved and prints the new isResolved value.

set -euo pipefail

export GH_PAGER=cat
readonly REPO="elastic/kibana"
readonly STARTUP_WINDOW_SECONDS=300
readonly POLL_INTERVAL_SECONDS=20

die() {
  echo "libra.sh: $*" >&2
  exit 2
}

report() {
  echo "libra=$1 sha=$2 description=\"$3\""
}

cmd_wait() {
  [[ $# -ge 1 ]] || die "wait requires a PR number"
  local pr="$1"
  shift
  local sha=""
  local timeout=1200
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --sha) sha="$2"; shift 2 ;;
      --timeout) timeout="$2"; shift 2 ;;
      *) die "unknown option for wait: $1" ;;
    esac
  done
  if [[ -z "$sha" ]]; then
    sha=$(gh pr view "$pr" -R "$REPO" --json headRefOid --jq .headRefOid)
  fi

  local start=$SECONDS
  while true; do
    local elapsed=$((SECONDS - start))
    local status
    # Statuses are returned newest first, so the first Libra entry is the current one.
    status=$(gh api "repos/$REPO/commits/$sha/statuses?per_page=100" \
      --jq '[.[] | select(.context == "Libra")][0] // empty | "\(.state)\t\(.description)"')

    if [[ -z "$status" ]]; then
      if ((elapsed >= STARTUP_WINDOW_SECONDS)); then
        report none "$sha" "no Libra status after ${STARTUP_WINDOW_SECONDS}s"
        return
      fi
    else
      local state="${status%%$'\t'*}"
      local description="${status#*$'\t'}"
      case "$state" in
        success)
          case "$description" in
            *noop*) report clean "$sha" "$description" ;;
            *[Ss]kipped*) report skipped "$sha" "$description" ;;
            *) report findings "$sha" "$description" ;;
          esac
          return
          ;;
        failure | error)
          report error "$sha" "$description"
          return
          ;;
      esac
    fi

    if ((elapsed >= timeout)); then
      report timeout "$sha" "${status#*$'\t'}"
      return
    fi
    sleep "$POLL_INTERVAL_SECONDS"
  done
}

cmd_threads() {
  [[ $# -eq 1 ]] || die "threads requires a PR number"
  local pr="$1"
  # shellcheck disable=SC2016
  gh api graphql --paginate \
    -F owner="${REPO%/*}" -F repo="${REPO#*/}" -F pr="$pr" \
    -f query='
      query($owner: String!, $repo: String!, $pr: Int!, $endCursor: String) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pr) {
            reviewThreads(first: 100, after: $endCursor) {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                isResolved
                isOutdated
                path
                line
                comments(first: 50) { nodes { databaseId url body author { login } } }
              }
            }
          }
        }
      }' \
    --jq '.data.repository.pullRequest.reviewThreads.nodes[]
      | select(.isResolved | not)
      | .comments.nodes as $comments
      | ($comments | map(select(.author.login | test("^infra-vault-gh-plugin-prod") | not)) | length) as $otherReplies
      | select($comments[0].author.login | test("^infra-vault-gh-plugin-prod"))
      | select($comments[-1].author.login | test("^infra-vault-gh-plugin-prod"))
      | {
          threadId: .id,
          commentId: $comments[0].databaseId,
          path,
          line,
          isOutdated,
          url: $comments[0].url,
          body: $comments[0].body,
          followUp: ($otherReplies > 0),
          otherReplies: $otherReplies
        }
      + (if $otherReplies > 0 then { latestCommentId: $comments[-1].databaseId, latestBody: $comments[-1].body } else {} end)'
}

cmd_resolve() {
  [[ $# -eq 1 ]] || die "resolve requires a thread id"
  # shellcheck disable=SC2016
  gh api graphql -F id="$1" \
    -f query='mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { isResolved } } }' \
    --jq '.data.resolveReviewThread.thread.isResolved'
}

[[ $# -ge 1 ]] || die "usage: libra.sh <wait|threads|resolve> ..."
command="$1"
shift
case "$command" in
  wait) cmd_wait "$@" ;;
  threads) cmd_threads "$@" ;;
  resolve) cmd_resolve "$@" ;;
  *) die "unknown command: $command" ;;
esac
