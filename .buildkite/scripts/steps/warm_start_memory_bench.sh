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

skip() {
  echo "--- Skipping warm-start memory benchmark"
  echo "$1"
  exit 0
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

EFFECTIVE_BUILD_ID=$(buildkite-agent meta-data get "kibana-effective-build-id" 2>/dev/null || echo "")
if [[ -z "$EFFECTIVE_BUILD_ID" ]]; then
  skip "No kibana-effective-build-id metadata; the build step did not publish a distributable."
fi

if [[ "$EFFECTIVE_BUILD_ID" != "$BUILDKITE_BUILD_ID" ]]; then
  skip "This build reused the distributable from $EFFECTIVE_BUILD_ID, so it does not contain this PR's code."
fi

BASELINE_BUILD_ID=$(ts-node .buildkite/scripts/steps/bench/resolve_merge_base_build.ts || echo "")
if [[ -z "$BASELINE_BUILD_ID" ]]; then
  skip "No usable merge-base distributable for ${GITHUB_PR_MERGE_BASE:-unknown merge base}."
fi

.buildkite/scripts/bootstrap.sh

download_and_extract baseline "$BASELINE_BUILD_ID" "$BASELINE_BUILD_DIR"
download_and_extract target "$EFFECTIVE_BUILD_ID" "$TARGET_BUILD_DIR"

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

# onCompare writes the report before it throws on a regression, so a missing
# report means the benchmark died earlier — infra trouble, not memory growth.
# This step can never fail the build, so an annotation is the only visibility.
if [[ ! -f "$REPORT_PATH" ]]; then
  buildkite-agent annotate \
    --context "warm-start-memory-bench" \
    --style "warning" \
    "Warm-start memory benchmark did not produce a report (exit ${BENCH_EXIT}). No memory comparison was made for this PR." \
    || echo "Warning: failed to annotate the build"
  exit 0
fi

buildkite-agent artifact upload "$REPORT_PATH" || echo "Warning: failed to upload the report"

echo "--- Report warm-start memory results"
ts-node .buildkite/scripts/steps/bench/notify_warm_start_memory.ts \
  --report-path "$REPORT_PATH" \
  --metrics-path "$METRICS_PATH" \
  || echo "Warning: failed to report warm-start memory results"

if [[ -f "$METRICS_PATH" ]]; then
  node scripts/ship_ci_stats --metrics "$METRICS_PATH" || echo "Warning: failed to ship ci-stats metrics"
fi

# Non-blocking: a regression is surfaced through the PR comment, not the build status.
exit 0
