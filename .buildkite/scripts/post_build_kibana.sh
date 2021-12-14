#!/usr/bin/env bash

set -euo pipefail

if [[ ! "${DISABLE_CI_STATS_SHIPPING:-}" ]]; then
  echo "--- Ship Kibana Distribution Metrics to CI Stats"
  node scripts/ship_ci_stats \
    --metrics target/optimizer_bundle_metrics.json \
    --metrics build/kibana/node_modules/@kbn/ui-shared-deps-src/shared_built_assets/metrics.json
fi

echo "--- Upload Build Artifacts"
# Moving to `target/` first will keep `buildkite-agent` from including directories in the artifact name
cd "$KIBANA_DIR/target"
cp kibana-*-linux-x86_64.tar.gz kibana-default.tar.gz
buildkite-agent artifact upload "./*.tar.gz;./*.zip;./*.deb;./*.rpm"
cd -
