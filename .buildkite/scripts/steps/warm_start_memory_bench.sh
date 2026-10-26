#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

BENCH_CONFIG_PATH="src/platform/packages/shared/kbn-core-server-benchmarks/ci_warm_start_memory.benchmark.config.ts"
ARTIFACT_FILENAME="kibana-default.tar.zst"
WORK_DIR="target/warm-start-memory-bench"
BASELINE_BUILD_DIR="${WORK_DIR}/baseline"
TARGET_BUILD_DIR="${WORK_DIR}/target"
REPORT_PATH="target/warm_start_memory_regression_report.json"
METRICS_PATH="${WORK_DIR}/warm_start_memory_ci_stats_metrics.json"
SOFT_FAIL_EXIT_CODE=10

soft_fail() {
  echo "--- Warm-start memory benchmark made no comparison"
  echo "$1"
  buildkite-agent annotate --context "warm-start-memory-bench" --style "warning" "$1" \
    || echo "Warning: failed to annotate the build"
  exit "$SOFT_FAIL_EXIT_CODE"
}

download_and_extract() {
  local side="$1" build_id="$2" extract_dir="$3"
  local stage_dir="${WORK_DIR}/.staging/${side}"

  echo "--- Download ${side} distributable from build ${build_id}"
  rm -rf "$stage_dir" "$extract_dir"
  mkdir -p "$stage_dir" "$extract_dir"

  download_tmp_artifact "$ARTIFACT_FILENAME" "$stage_dir" "$build_id"

  # --strip=1 drops the versioned top-level directory so the extract dir holds
  # bin/kibana directly, which is what --left-build-dir/--right-build-dir expect.
  tar -xf "${stage_dir}/${ARTIFACT_FILENAME}" -I zstd -C "$extract_dir" --strip=1
  rm -rf "$stage_dir"
}

echo "--- Resolve distributables"

TARGET_BUILD_ID="${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"

# The PR bot only reuses a build when the PR changes no runtime code, so a reused
# kibana-on-merge distributable is plain main and there is nothing of this PR to measure.
if [[ "${KIBANA_REUSABLE_BUILD_JOB_URL:-}" == */kibana-on-merge/builds/* ]]; then
  message="This build reuses a kibana-on-merge distributable, so this PR changes no server runtime code. No memory comparison is needed."
  echo "--- Warm-start memory benchmark not needed"
  echo "$message"
  buildkite-agent annotate --context "warm-start-memory-bench" --style "info" "$message" \
    || echo "Warning: failed to annotate the build"
  exit 0
fi

if ! BASELINE_BUILD_ID=$(node .buildkite/scripts/steps/bench/resolve_merge_base_build.ts); then
  soft_fail "Baseline build lookup failed; see the step log. No memory comparison was made for this PR."
fi
if [[ -z "$BASELINE_BUILD_ID" ]]; then
  soft_fail "No baseline distributable for merge base ${GITHUB_PR_MERGE_BASE}; it has likely expired. No memory comparison was made for this PR."
fi

.buildkite/scripts/bootstrap.sh

download_and_extract baseline "$BASELINE_BUILD_ID" "$BASELINE_BUILD_DIR"
download_and_extract target "$TARGET_BUILD_ID" "$TARGET_BUILD_DIR"

export KIBANA_CI_WARM_START_MEMORY_BASELINE_BUILD_ID="$BASELINE_BUILD_ID"
export KIBANA_CI_WARM_START_MEMORY_REPORT_PATH="$REPORT_PATH"

echo "--- Warm-start memory benchmark against merge base"
rm -f "$REPORT_PATH"
set +e
node scripts/bench.js \
  --config "$BENCH_CONFIG_PATH" \
  --config-from-cwd \
  --left-build-dir "$BASELINE_BUILD_DIR" \
  --right-build-dir "$TARGET_BUILD_DIR"
BENCH_EXIT=$?
set -e

# Disk sizing data for the agent config: overall fill plus this step's own footprint.
echo "--- Disk usage"
df -h /
du -sh "$WORK_DIR"/* 2>/dev/null || true

# onCompare writes the report before it throws on a regression, so a missing
# report means the benchmark died earlier, from infra trouble rather than memory growth.
if [[ ! -f "$REPORT_PATH" ]]; then
  soft_fail "Warm-start memory benchmark did not produce a report (exit ${BENCH_EXIT}). No memory comparison was made for this PR."
fi

buildkite-agent artifact upload "$REPORT_PATH" || echo "Warning: failed to upload the report"

echo "--- Report warm-start memory results"
NOTIFY_EXIT=0
node .buildkite/scripts/steps/bench/notify_warm_start_memory.ts \
  --report-path "$REPORT_PATH" \
  --metrics-path "$METRICS_PATH" \
  || NOTIFY_EXIT=$?

if [[ -f "$METRICS_PATH" ]]; then
  node scripts/ship_ci_stats --metrics "$METRICS_PATH" || echo "Warning: failed to ship ci-stats metrics"
fi

if [[ "$(jq -r '.outcome' "$REPORT_PATH")" == "inconclusive" ]]; then
  soft_fail "$(jq -r '"Warm-start memory comparison was inconclusive: only \(.comparison.validPairs) of \(.comparison.requestedPairs) required pairs completed after \(.comparison.attemptedPairs) attempts. No memory comparison was made for this PR."' "$REPORT_PATH")"
fi

if [[ "$NOTIFY_EXIT" -ne 0 ]]; then
  soft_fail "Failed to report warm-start memory results (exit ${NOTIFY_EXIT}); a regression comment may be missing. See the step log."
fi

# Non-blocking: a regression is surfaced through the PR comment, not the build status.
exit 0
