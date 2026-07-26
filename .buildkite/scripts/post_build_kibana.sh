#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common/util.sh"


# [rspack-transition] avoid shipping bundle sizes while RSPack is not the default
if [[ "${KBN_USE_RSPACK:-}" == "true" ]]; then
  echo "Skipping shipping bundle sizes to CI Stats (rspack build)"
  export DISABLE_CI_STATS_SHIPPING=true
fi

if [[ ! "${DISABLE_CI_STATS_SHIPPING:-}" ]]; then
  cmd=(
    "node" "scripts/ship_ci_stats"
      "--metrics" "target/optimizer_bundle_metrics.json"
      "--metrics" "build/kibana/node_modules/@kbn/ui-shared-deps-src/shared_built_assets/metrics.json"
  )

  if [[ "$BUILDKITE_PIPELINE_SLUG" == "kibana-on-merge" ]] || [[ "$BUILDKITE_PIPELINE_SLUG" == "kibana-pull-request" ]]; then
    cmd+=("--validate")
  fi

  echo "--- Ship Kibana Distribution Metrics to CI Stats"
  "${cmd[@]}"
fi

echo "--- Upload Build Artifacts"
# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
version="$(jq -r '.version' package.json)"
cd "$KIBANA_DIR/target"
cp "kibana-$version-SNAPSHOT-linux-x86_64.tar.zst" kibana-default.tar.zst

upload_tmp_artifact "$KIBANA_DIR/target/kibana-default.tar.zst" kibana-default.tar.zst "$BUILDKITE_BUILD_ID" &
GCS_UPLOAD_PID=$!

buildkite-agent artifact upload "./*.tar.zst;./*.tar.gz;./*.zip;./*.deb;./*.rpm"
cd -

# [rspack-transition] Upload build type marker for cache validation.
# Delete this block when the legacy optimizer is removed.
if [[ "${KBN_USE_RSPACK:-}" == "true" ]]; then
  echo "rspack" > "$KIBANA_DIR/target/kibana-build-type.txt"
else
  echo "legacy" > "$KIBANA_DIR/target/kibana-build-type.txt"
fi
cd "$KIBANA_DIR/target"
buildkite-agent artifact upload "kibana-build-type.txt"
cd -

wait "$GCS_UPLOAD_PID"
