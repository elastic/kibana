#!/usr/bin/env bash
#
# Restacks the Isomer demo lane. Demo only: never PR'd, never pushed to elastic/kibana.
#
#   scripts/isomer_demo/rebuild.sh [--base <ref>] [--bootstrap] [--fork <remote>]
#
# The demo is a linear stack of isomer/demo/* branches on the PR lane head; its top, isomer/demo/latest, holds these
# docs and is the branch to run.
#
# 1. Resolves the PR lane head: the highest Isomer stack branch pushed to `upstream`.
# 2. Restacks the isomer/demo/* branches: onto the head when it has moved, and each onto the branch below when that
#    changed (rerere is on, so a conflict resolved once stays resolved). To fix a lower branch, commit to it and re-run.
# 3. With --fork, force-pushes every isomer/demo/* branch to that remote.
#
# Run it from a worktree on an isomer/demo/* branch. Git can't rebase a branch checked out in another worktree.
#
# Stops with the conflicted files when rerere can't settle a conflict. Resolve, `git rebase --continue`, and re-run:
# topics already on their new parent are skipped.

set -euo pipefail

TOPICS=(
  isomer/demo/components
  isomer/demo/charts
  isomer/demo/vega
  isomer/demo/charts-engines
  isomer/demo/maps
  isomer/demo/drawing
  isomer/demo/lowering
  isomer/demo/dashboard-pack
  isomer/demo/dashboard-export
  isomer/demo/render-composition
  isomer/demo/render-host
  isomer/demo/latest
)
# The PR lane's branches, in any order: the head is the pushed one that contains the most others, so reordering the stack
# (as when S5 moved above S6) needs no change here.
PR_LANE=(
  isomer/agent-builder-runtime
  isomer/s2-message-primitives
  isomer/s3-nightshift
  isomer/s4-data-primitives
  isomer/s5-image
  isomer/s6-ab-compositions
)
TOP=isomer/demo/latest
REMOTE=upstream

if [[ -z "${ISOMER_DEMO_REEXEC:-}" ]]; then
  copy="$(mktemp -t isomer_demo_rebuild.XXXXXX)"
  cp "$0" "$copy"
  ISOMER_DEMO_REEXEC=1 exec bash "$copy" "$@"
fi

base=''
bootstrap=0
fork=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) base="$2"; shift 2 ;;
    --bootstrap) bootstrap=1; shift ;;
    --fork) fork="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

die() { echo "rebuild: $*" >&2; exit 1; }
exists() { git rev-parse --verify --quiet "$1^{commit}" >/dev/null; }
rebasing() { [[ -d "$(git rev-parse --git-path rebase-merge)" || -d "$(git rev-parse --git-path rebase-apply)" ]]; }
unmerged() { git diff --name-only --diff-filter=U; }

current="$(git branch --show-current)"
[[ "$current" == isomer/demo/* ]] || die "run from a worktree on an isomer/demo/* branch (on '$current')"
if [[ -n "$fork" ]]; then
  fork_url="$(git remote get-url "$fork")"
  [[ "$fork_url" != *elastic/kibana* ]] || die "refusing to push to '$fork' ($fork_url)"
fi

git config rerere.enabled true
git config rerere.autoupdate true

rebasing && die "a rebase is in progress: resolve it and run 'git rebase --continue', then re-run"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || die "the working tree is dirty"

git fetch --quiet "$REMOTE" '+refs/heads/isomer/*:refs/remotes/upstream/isomer/*'
if [[ -z "$base" ]]; then
  pushed=()
  for branch in "${PR_LANE[@]}"; do
    exists "refs/remotes/$REMOTE/$branch" && pushed+=("$REMOTE/$branch")
  done
  # The head contains the most other lane branches. A lower branch it doesn't contain (such as a CI fix commit
  # not yet carried up the stack) is named, not merged.
  best=-1
  for candidate in "${pushed[@]}"; do
    count=0
    for other in "${pushed[@]}"; do
      git merge-base --is-ancestor "$other" "$candidate" && count=$((count + 1))
    done
    if [[ $count -gt $best ]]; then
      best=$count
      base="$candidate"
    fi
  done
  [[ -n "$base" ]] || die "no PR lane branch found on $REMOTE"
  for other in "${pushed[@]}"; do
    git merge-base --is-ancestor "$other" "$base" ||
      echo "warning: $base doesn't contain $other ($(git rev-list --count "$base..$other") commits); not in the demo" >&2
  done
fi
[[ -n "$base" ]] || die "no PR lane branch found on $REMOTE"
head="$(git rev-parse "$base^{commit}")"
echo "PR lane head: $base ($(git log -1 --format='%h %s' "$head"))"

present=()
for topic in "${TOPICS[@]}"; do
  if exists "refs/heads/$topic"; then
    present+=("$topic")
    git config "branch.$topic.pushRemote" no-push
  fi
done
[[ ${#present[@]} -gt 0 ]] || die "no isomer/demo/* branches exist"

# Restack. A topic whose parent moved is rebased onto it, from the parent's old tip: the state file keeps the old
# base and tips when the PR lane head moves, and `git merge-base --fork-point` finds the old tip when a topic lower
# in the stack changed. The state file also lets a re-run after a conflict pick up where it stopped.
state="$(git rev-parse --git-path isomer-demo-restack)"
old_base="$(git config "branch.${present[0]}.demoBase" || true)"
[[ -n "$old_base" ]] || old_base="$(git merge-base "$head" "${present[0]}")"
if [[ "$old_base" != "$head" && ! -f "$state" ]]; then
  {
    echo "base $old_base"
    for topic in "${present[@]}"; do echo "$topic $(git rev-parse "$topic")"; done
  } >"$state"
fi
old_parent="$(awk '$1 == "base" { print $2 }' "$state" 2>/dev/null || true)"
new_parent="$base"
for topic in "${present[@]}"; do
  old_tip="$(awk -v t="$topic" '$1 == t { print $2 }' "$state" 2>/dev/null || true)"
  if git merge-base --is-ancestor "$new_parent" "$topic"; then
    echo "  $topic: on $(git rev-parse --short "$new_parent")"
  else
    # The recorded old parent only if the topic sits on it; otherwise where it forked, from the parent's reflog.
    from="$old_parent"
    if [[ -z "$from" ]] || ! git merge-base --is-ancestor "$from" "$topic"; then
      from="$(git merge-base --fork-point "$new_parent" "$topic" || true)"
    fi
    [[ -n "$from" ]] || die "can't find where $topic forked from $new_parent; rebase it by hand"
    echo "  $topic: rebasing onto $(git rev-parse --short "$new_parent")"
    git rebase --quiet --onto "$new_parent" "$from" "$topic" || true
    while rebasing; do
      if [[ -n "$(unmerged)" ]]; then
        echo "rerere could not resolve these in $topic:" >&2
        unmerged >&2
        die "resolve them, run 'git rebase --continue', then re-run this script"
      fi
      GIT_EDITOR=true git rebase --continue || true
    done
  fi
  old_parent="${old_tip:-$old_parent}"
  new_parent="$topic"
done
rm -f "$state"
git config "branch.${present[0]}.demoBase" "$head"

git switch --quiet "$current"

if [[ $bootstrap -eq 1 ]]; then
  node scripts/kbn bootstrap
fi
if [[ -n "$fork" ]]; then
  git push --force "$fork" "${present[@]}"
fi
echo "$TOP is $(git rev-parse --short "$TOP") on $base"
