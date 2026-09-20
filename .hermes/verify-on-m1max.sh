#!/bin/bash
# Runs a Kibana gate on the host where this worktree is bootstrapped (m1max), after
# proving the remote tree is byte-identical to the local one.
#
# Why: this worktree is deliberately NOT bootstrapped locally (Kibana gates run on
# m1max), so `node scripts/*` cannot execute here -- it dies on @kbn/setup-node-env.
# Running the gate remotely while recording evidence locally is only honest if the
# bytes match, so drift fails the gate instead of producing a false green.
set -euo pipefail

REMOTE_HOST=m1max
REMOTE_DIR=/Users/mac/Projects/kibana.worktrees/hunt-worker-agent-picker
BASE=3212aa456d2d
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[ $# -ge 1 ] || { echo "usage: $0 <gate command>" >&2; exit 2; }

# Every file this branch touches, per the remote (which carries the commit).
# bash 3.2 (macOS default) has no mapfile.
FILES=()
while IFS= read -r line; do [ -n "$line" ] && FILES+=("$line"); done < <(ssh "$REMOTE_HOST" "cd $REMOTE_DIR && git diff --name-only $BASE HEAD")
[ "${#FILES[@]}" -gt 0 ] || { echo "DRIFT GUARD: no changed files found -- refusing to claim a gate" >&2; exit 1; }

# Missing locally is drift too (e.g. a generated file that only exists on the gate host),
# so hash every path uniformly and report absence rather than dying on it.
sums_of() { for f in "${FILES[@]}"; do if [ -f "$f" ]; then md5 -q "$f"; else echo "ABSENT"; fi; done; }
remote_sums="$(ssh "$REMOTE_HOST" "cd $REMOTE_DIR && $(declare -f sums_of); FILES=($(printf '%q ' "${FILES[@]}")); sums_of")"
local_sums="$(cd "$LOCAL_DIR" && sums_of)"

if [ "$remote_sums" != "$local_sums" ]; then
  echo "DRIFT GUARD FAILED: local and $REMOTE_HOST differ; gate would not describe this workspace." >&2
  paste <(printf '%s\n' "${FILES[@]}") <(printf '%s\n' "$local_sums") <(printf '%s\n' "$remote_sums") >&2
  exit 1
fi
echo "drift guard: ${#FILES[@]} changed files identical on $REMOTE_HOST"

ssh "$REMOTE_HOST" "cd $REMOTE_DIR && source ~/.nvm/nvm.sh && nvm use 24.21.0 >/dev/null 2>&1 && $*"
