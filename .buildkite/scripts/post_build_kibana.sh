#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common/util.sh"

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
  if ! "${cmd[@]}"; then
    # On PR builds, auto-fix limit overages from the metrics this build already produced and push as kibanamachine.
    # Overages above 15% (per-build, vs current limits.yml) are refused and fail as before; the bundle-size-limits-comment workflow is the tripwire for cumulative bumps.
    if [[ "${BUILDKITE_PIPELINE_SLUG:-}" == "kibana-pull-request" ]] && ! is_auto_commit_disabled; then
      echo "--- Attempting to auto-update bundle size limits from build metrics"
      if node scripts/build_rspack_bundles --update-limits-from-metrics target/optimizer_bundle_metrics.json; then
        # check_for_changed_files commits ALL tracked changes, so only auto-commit when limits.yml is the only modified file
        unexpected_changes="$(git status --porcelain -- . ':!packages/kbn-rspack-optimizer/limits.yml' ':!config/node.options' ':!config/kibana.yml')"
        if [[ -z "$unexpected_changes" ]]; then
          check_for_changed_files "node scripts/build_rspack_bundles --update-limits" true "Update bundle limits"
        else
          echo "Not auto-committing bundle limits: unexpected working tree changes alongside limits.yml:"
          echo "$unexpected_changes"
        fi
      fi
    fi
    exit 1
  fi
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
if [[ "${KBN_USE_RSPACK:-}" == "false" || "${KBN_USE_RSPACK:-}" == "0" ]]; then
  echo "legacy" > "$KIBANA_DIR/target/kibana-build-type.txt"
else
  echo "rspack" > "$KIBANA_DIR/target/kibana-build-type.txt"
fi
cd "$KIBANA_DIR/target"
buildkite-agent artifact upload "kibana-build-type.txt"
cd -

wait "$GCS_UPLOAD_PID"
