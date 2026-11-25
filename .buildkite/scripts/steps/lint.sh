#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

echo '--- Lint: stylelint'
node scripts/stylelint
echo "stylelint ✅"

# oxlint sometimes segfaults in its native code while exiting (`runOxlintShard` re-runs the shard).
# Keep core dumps of crashed processes so their backtraces can be reported upstream.
oxlint_core_dir="$(mktemp -d)"
if sudo -n true 2>/dev/null; then
  sudo sysctl -q -w "kernel.core_pattern=$oxlint_core_dir/core.%e.%p" || echo "core_pattern is not writable, oxlint crashes won't leave core dumps"
  # `ulimit -c unlimited` left the limit at 0 on CI agents; raising the hard limit needs root
  sudo prlimit --pid $$ --core=unlimited || echo "core size limit can't be raised, oxlint crashes won't leave core dumps"
fi
echo "oxlint core dumps: core_pattern=$(cat /proc/sys/kernel/core_pattern 2>/dev/null), ulimit -c=$(ulimit -c)"

report_oxlint_crashes() {
  local core report
  for core in "$oxlint_core_dir"/core.*; do
    [[ -f "$core" ]] || continue
    echo "--- oxlint crashed, backtrace of $(basename "$core")"
    if ! command -v gdb >/dev/null; then
      { sudo apt-get update -qq && sudo apt-get install -y -qq gdb >/dev/null; } || { echo "gdb is unavailable, skipping backtrace"; continue; }
    fi
    mkdir -p target/oxlint_crashes
    report="target/oxlint_crashes/$(basename "$core").txt"
    gdb -q -batch -ex 'info sharedlibrary' -ex 'thread apply all bt' "$(command -v node)" "$core" > "$report" 2>&1
    cat "$report"
    buildkite-agent artifact upload "$report"
    rm -f "$core"
  done
}

# disable "Exit immediately" mode so that we can run oxlint and eslint, capture their exit codes,
# and respond appropriately after possibly commiting fixed files to the repo.
# oxlint runs first so that eslint (prettier) formats any oxlint autofixes in the same pass.
set +e;
if is_pr && ! is_auto_commit_disabled; then
  fix_flag="--fix"
else
  fix_flag=""
fi

echo '--- Lint: oxlint'
node scripts/lint.js --quiet $fix_flag
oxlint_exit=$?
report_oxlint_crashes

echo '--- Lint: eslint'
node scripts/eslint_all_files --no-cache $fix_flag
eslint_exit=$?
# re-enable "Exit immediately" mode
set -e;

desc="node scripts/lint.js --quiet $fix_flag && node scripts/eslint_all_files --no-cache $fix_flag"
check_for_changed_files "$desc" true

if [[ "${oxlint_exit}" != "0" ]]; then
  echo "oxlint ❌"
fi
if [[ "${eslint_exit}" != "0" ]]; then
  echo "eslint ❌"
fi
if [[ "${oxlint_exit}" != "0" || "${eslint_exit}" != "0" ]]; then
  exit 1
fi

echo "oxlint ✅"
echo "eslint ✅"
