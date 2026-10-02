#!/usr/bin/env bash
# Helpers for driving an elastic/kibana PR through review and CI rounds.
#
# Usage:
#   bash .agents/skills/pr-review-loop/scripts/pr.sh signals <pr>
#   bash .agents/skills/pr-review-loop/scripts/pr.sh wait <pr> --for <libra,claude,ci> [--sha <sha>] [--timeout <seconds>]
#   bash .agents/skills/pr-review-loop/scripts/pr.sh threads <pr> --reviewer <libra|claude>
#   bash .agents/skills/pr-review-loop/scripts/pr.sh resolve <thread-id>
#
# signals  Prints which signals will act on the PR and whether it merges cleanly:
#            libra=<on|off> [reason="…"]
#            claude=<on|off> [reason="…"]
#            ci=<on|off> [reason="…"]
#            mergeable=<MERGEABLE|CONFLICTING|UNKNOWN> base=<branch> head=<branch>
# wait     Blocks until every requested signal has a result, then prints one line per signal:
#            libra=<clean|findings|skipped|error|none|timeout|pending> sha=<sha> detail="…"
#            claude=<clean|findings|skipped|error|none|timeout|pending> sha=<sha> detail="…" [review=<id>]
#            ci=<passed|failed|none|timeout|pending> sha=<sha> detail="…" [url=<build-url>]
#          --sha defaults to the newest PR commit not pushed by kibanamachine. It applies to libra and
#          claude; ci always follows the PR head, because kibanamachine fix-up commits restart CI.
#          none means no result appeared within the signal's startup window. --timeout 0 polls once and
#          reports pending for every signal that has no result yet.
# threads  Prints one JSON object per unresolved thread opened by the reviewer whose latest comment is
#          the reviewer's. followUp is true when the reviewer is answering a reply; otherReplies counts
#          the other comments in the thread, and latestCommentId/latestBody hold the reviewer's answer.
# resolve  Marks a review thread as resolved and prints the new isResolved value.

set -euo pipefail

export GH_PAGER=cat
readonly REPO="elastic/kibana"
readonly POLL_INTERVAL_SECONDS=30
readonly CLAUDE_WORKFLOW="reviewer-claude.lock.yml"

die() {
  echo "pr.sh: $*" >&2
  exit 2
}

report() {
  local signal="$1" state="$2" sha="$3" detail="$4" extra="${5:-}"
  echo "${signal}=${state} sha=${sha} detail=\"${detail}\"${extra:+ $extra}"
}

cmd_signals() {
  [[ $# -eq 1 ]] || die "signals requires a PR number"
  gh pr view "$1" -R "$REPO" --json isDraft,labels,mergeable,baseRefName,headRefName --jq '
    [.labels[].name] as $labels
    | def labeled($l): $labels | index($l) != null;
    def line($name; $off; $reason): if $off then "\($name)=off reason=\"\($reason)\"" else "\($name)=on" end;
    (if labeled("reviewer:skip-ai") then line("libra"; true; "reviewer:skip-ai label")
     else line("libra"; .isDraft and (labeled("ci:draft-checks") | not); "draft without ci:draft-checks") end),
    (if labeled("reviewer:skip-ai") then line("claude"; true; "reviewer:skip-ai label")
     else line("claude"; labeled("reviewer:claude") | not; "no reviewer:claude label") end),
    (if labeled("skip-ci") then line("ci"; true; "skip-ci label")
     else line("ci"; .isDraft and (labeled("ci:build-draft") | not); "draft without ci:build-draft") end),
    "mergeable=\(.mergeable) base=\(.baseRefName) head=\(.headRefName)"'
}

# Each poll function prints "<state>\t<detail>[\t<extra>]" once the signal has a result, or nothing while
# it's pending. They print "missing" while no result has appeared yet, so the caller can apply the startup
# window.

poll_libra() {
  local sha="$1" status
  # The combined status keeps only the newest status per context, so this yields at most one line.
  status=$(gh api "repos/$REPO/commits/$sha/status?per_page=100" --paginate \
    --jq '.statuses[] | select(.context == "Libra") | "\(.state)\t\(.description)"')
  if [[ -z "$status" ]]; then
    echo "missing"
    return
  fi
  local state="${status%%$'\t'*}" description="${status#*$'\t'}"
  case "$state" in
    success)
      case "$description" in
        *noop*) printf 'clean\t%s\n' "$description" ;;
        *[Ss]kipped*) printf 'skipped\t%s\n' "$description" ;;
        *) printf 'findings\t%s\n' "$description" ;;
      esac
      ;;
    failure | error) printf 'error\t%s\n' "$description" ;;
  esac
}

poll_claude() {
  local pr="$1" sha="$2" runs
  # Every label change starts a run on the current head, and those runs skip the agent job. So a commit can have
  # several runs, and the newest isn't necessarily the one that reviewed it.
  runs=$(gh api "repos/$REPO/actions/workflows/$CLAUDE_WORKFLOW/runs?head_sha=$sha&event=pull_request_target&per_page=100" \
    --jq '.workflow_runs | sort_by(.created_at) | reverse | .[] | "\(.id)\t\(.status)\t\(.conclusion // "")\t\(.html_url)"')
  if [[ -z "$runs" ]]; then
    echo "missing"
    return
  fi
  if grep -qv $'\tcompleted\t' <<<"$runs"; then
    return 0
  fi

  local id status conclusion url failed="" skipped=""
  while IFS=$'\t' read -r id status conclusion url; do
    if [[ "$conclusion" != "success" ]]; then
      failed="run $conclusion: $url"
      continue
    fi
    local agent
    agent=$(gh api "repos/$REPO/actions/runs/$id/jobs?per_page=100" --paginate \
      --jq '.jobs[] | select(.name == "agent") | .conclusion')
    if [[ "$agent" == "skipped" ]]; then
      skipped="agent job skipped: $url"
      continue
    fi
    # The reviewer posts as the shared github-actions bot, so match the review by the run link in its marker.
    local review
    review=$(gh api "repos/$REPO/pulls/$pr/reviews?per_page=100" --paginate \
      --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | contains(\"actions/runs/$id \"))) | .id" |
      tail -n 1)
    if [[ -n "$review" ]]; then
      printf 'findings\t%s\treview=%s\n' "$url" "$review"
    else
      printf 'clean\t%s\n' "$url"
    fi
    return
  done <<<"$runs"

  if [[ -n "$failed" ]]; then
    printf 'error\t%s\n' "$failed"
  else
    printf 'skipped\t%s\n' "$skipped"
  fi
}

poll_ci() {
  local head="$1" status
  status=$(gh api "repos/$REPO/commits/$head/status?per_page=100" --paginate \
    --jq '.statuses[] | select(.context == "kibana-ci") | "\(.state)\t\(.target_url // "")"')
  if [[ -z "$status" ]]; then
    echo "missing"
    return
  fi
  local state="${status%%$'\t'*}" url="${status#*$'\t'}"
  case "$state" in
    success) printf 'passed\t%s\turl=%s\n' "build passed" "$url" ;;
    failure | error) printf 'failed\t%s\turl=%s\n' "build $state" "$url" ;;
  esac
}

default_sha() {
  local pr="$1" sha
  # kibanamachine fix-up commits aren't reviewed by Libra, so the PR head can be a commit that never gets a review.
  sha=$(gh api "repos/$REPO/pulls/$pr/commits?per_page=100" --paginate \
    --jq '.[] | select((.author.login // "") != "kibanamachine") | .sha' | tail -n 1)
  [[ -n "$sha" ]] || die "no commit on PR $pr that a reviewer would review"
  echo "$sha"
}

cmd_wait() {
  [[ $# -ge 1 ]] || die "wait requires a PR number"
  local pr="$1"
  shift
  local sha="" signals="" timeout_override=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --for) signals="$2"; shift 2 ;;
      --sha) sha="$2"; shift 2 ;;
      --timeout) timeout_override="$2"; shift 2 ;;
      *) die "unknown option for wait: $1" ;;
    esac
  done
  [[ -n "$signals" ]] || die "wait requires --for <libra,claude,ci>"

  local want_libra=false want_claude=false want_ci=false signal
  for signal in ${signals//,/ }; do
    case "$signal" in
      libra) want_libra=true ;;
      claude) want_claude=true ;;
      ci) want_ci=true ;;
      *) die "unknown signal: $signal" ;;
    esac
  done
  if [[ -z "$sha" ]] && { $want_libra || $want_claude; }; then
    sha=$(default_sha "$pr")
  fi

  # Startup window and timeout per signal, in seconds. Libra starts within a minute or two; the Claude reviewer
  # queues as a GitHub Actions workflow and can run for half an hour; a full CI build takes about an hour.
  local libra_startup=300 libra_timeout=1200
  local claude_startup=900 claude_timeout=3600
  local ci_startup=900 ci_timeout=7200
  local snapshot=false
  if [[ "$timeout_override" == "0" ]]; then
    snapshot=true
  elif [[ -n "$timeout_override" ]]; then
    libra_timeout=$timeout_override claude_timeout=$timeout_override ci_timeout=$timeout_override
  fi

  local libra_done claude_done ci_done
  libra_done=$($want_libra && echo "" || echo skip)
  claude_done=$($want_claude && echo "" || echo skip)
  ci_done=$($want_ci && echo "" || echo skip)
  local ci_head="" ci_head_since=$SECONDS
  local start=$SECONDS

  while [[ -z "$libra_done" || -z "$claude_done" || -z "$ci_done" ]]; do
    local elapsed=$((SECONDS - start)) result state detail extra

    if [[ -z "$libra_done" ]]; then
      result=$(poll_libra "$sha")
      if [[ "$result" == "missing" ]]; then
        ((elapsed < libra_startup)) || libra_done=$(report libra none "$sha" "no Libra status after ${libra_startup}s")
      elif [[ -n "$result" ]]; then
        IFS=$'\t' read -r state detail extra <<<"$result"
        libra_done=$(report libra "$state" "$sha" "$detail" "$extra")
      elif ((elapsed >= libra_timeout)); then
        libra_done=$(report libra timeout "$sha" "Libra still reviewing after ${libra_timeout}s")
      fi
    fi

    if [[ -z "$claude_done" ]]; then
      result=$(poll_claude "$pr" "$sha")
      if [[ "$result" == "missing" ]]; then
        ((elapsed < claude_startup)) || claude_done=$(report claude none "$sha" "no Claude Reviewer run after ${claude_startup}s")
      elif [[ -n "$result" ]]; then
        IFS=$'\t' read -r state detail extra <<<"$result"
        claude_done=$(report claude "$state" "$sha" "$detail" "$extra")
      elif ((elapsed >= claude_timeout)); then
        claude_done=$(report claude timeout "$sha" "Claude Reviewer still running after ${claude_timeout}s")
      fi
    fi

    if [[ -z "$ci_done" ]]; then
      local head
      head=$(gh api "repos/$REPO/pulls/$pr" --jq '.head.sha')
      if [[ "$head" != "$ci_head" ]]; then
        ci_head="$head"
        ci_head_since=$SECONDS
      fi
      result=$(poll_ci "$ci_head")
      if [[ "$result" == "missing" ]]; then
        ((SECONDS - ci_head_since < ci_startup)) ||
          ci_done=$(report ci none "$ci_head" "no kibana-ci status after ${ci_startup}s")
      elif [[ -n "$result" ]]; then
        IFS=$'\t' read -r state detail extra <<<"$result"
        ci_done=$(report ci "$state" "$ci_head" "$detail" "$extra")
      elif ((elapsed >= ci_timeout)); then
        ci_done=$(report ci timeout "$ci_head" "CI still running after ${ci_timeout}s")
      fi
    fi

    if $snapshot; then
      [[ -n "$libra_done" ]] || libra_done=$(report libra pending "$sha" "no result yet")
      [[ -n "$claude_done" ]] || claude_done=$(report claude pending "$sha" "no result yet")
      [[ -n "$ci_done" ]] || ci_done=$(report ci pending "$ci_head" "no result yet")
      break
    fi
    [[ -n "$libra_done" && -n "$claude_done" && -n "$ci_done" ]] && break
    sleep "$POLL_INTERVAL_SECONDS"
  done

  local line
  for line in "$libra_done" "$claude_done" "$ci_done"; do
    [[ "$line" == "skip" ]] || echo "$line"
  done
}

cmd_threads() {
  [[ $# -eq 3 && "$2" == "--reviewer" ]] || die "usage: threads <pr> --reviewer <libra|claude>"
  local pr="$1" reviewer="$3" login opener_check
  case "$reviewer" in
    libra)
      login="infra-vault-gh-plugin-prod"
      opener_check="true"
      ;;
    claude)
      # Claude, Codex and Scout reviewers all post as github-actions; only the marker in the review body that
      # opened the thread tells them apart.
      login="github-actions"
      opener_check='((.pullRequestReview.body // "") | contains("workflow_id: reviewer-claude,"))'
      ;;
    *) die "unknown reviewer: $reviewer" ;;
  esac
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
                opener: comments(first: 1) {
                  nodes { databaseId url body author { login __typename } pullRequestReview { body } }
                }
                comments(first: 100) { nodes { author { login __typename } } }
                latest: comments(last: 1) { nodes { databaseId body author { login __typename } } }
              }
            }
          }
        }
      }' \
    --jq "def bot: .author.__typename == \"Bot\" and .author.login == \"$login\";
      .data.repository.pullRequest.reviewThreads.nodes[]
      | select(.isResolved | not)
      | .opener.nodes[0] as \$opener
      | .latest.nodes[0] as \$latest
      | (.comments.nodes | map(select(bot | not)) | length) as \$otherReplies
      | select(\$opener | bot and $opener_check)
      | select(\$latest | bot)
      | {
          reviewer: \"$reviewer\",
          threadId: .id,
          commentId: \$opener.databaseId,
          path,
          line,
          isOutdated,
          url: \$opener.url,
          body: \$opener.body,
          followUp: (\$otherReplies > 0),
          otherReplies: \$otherReplies
        }
      + (if \$otherReplies > 0 then { latestCommentId: \$latest.databaseId, latestBody: \$latest.body } else {} end)"
}

cmd_resolve() {
  [[ $# -eq 1 ]] || die "resolve requires a thread id"
  # shellcheck disable=SC2016
  gh api graphql -F id="$1" \
    -f query='mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { isResolved } } }' \
    --jq '.data.resolveReviewThread.thread.isResolved'
}

[[ $# -ge 1 ]] || die "usage: pr.sh <signals|wait|threads|resolve> ..."
command="$1"
shift
case "$command" in
  signals) cmd_signals "$@" ;;
  wait) cmd_wait "$@" ;;
  threads) cmd_threads "$@" ;;
  resolve) cmd_resolve "$@" ;;
  *) die "unknown command: $command" ;;
esac
