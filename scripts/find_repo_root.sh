#!/usr/bin/env bash

# Resolves the absolute path to the Kibana repo root
#
#   1. Try `git rev-parse --show-toplevel` (fast, works in any git checkout).
#   2. If git is unavailable or this is not a git checkout (e.g. a release
#      tarball or a jj workspace), walk up from $PWD looking for the
#      `kibana.d.ts` sentinel file at the repo root.
#   3. If both fail, surface the original git error on stderr and exit
#      non-zero so the caller sees the real reason.

set -u

git_out=$(git rev-parse --show-toplevel 2>&1)
if [ $? -eq 0 ]; then
  echo "$git_out"
  exit 0
fi

dir="$PWD"
while [ "$dir" != "/" ] && [ ! -f "$dir/kibana.d.ts" ]; do
  dir="$(dirname "$dir")"
done

if [ -f "$dir/kibana.d.ts" ]; then
  echo "$dir"
  exit 0
fi

echo "$git_out" >&2
exit 1
