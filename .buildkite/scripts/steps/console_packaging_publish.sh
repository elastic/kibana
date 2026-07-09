#!/usr/bin/env bash
set -euo pipefail

# Publish pipeline for @kbn/one-console.
#
# On each merge to main, detect whether any relevant console source changed
# (excluding server/ and test/), run the packaging build, stamp the version
# as 0.0.0-<git-sha> and npm-publish the resulting tarball to Artifactory.
#
# Env overrides:
#   DRY_RUN=1         — build everything but skip the publish step.
#   BASE_REF=<ref>    — override the git base used for change detection.
#   FORCE_ALL=1       — build and publish regardless of diff.
#   SKIP_BOOTSTRAP=1  — skip `yarn kbn bootstrap` (local re-runs).
#   SKIP_BUILD=1      — skip packaging/scripts/build.sh; use whatever is
#                       already in target/ (useful when re-running after a
#                       successful build, or when testing the publish logic).

report_step() {
  echo "--- $1"
}

KIBANA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$KIBANA_ROOT"

source .buildkite/scripts/common/vault_fns.sh

if [[ "${SKIP_BOOTSTRAP:-}" == "1" ]]; then
  report_step "Bootstrap (skipped via SKIP_BOOTSTRAP=1)"
else
  report_step "Bootstrap"
  .buildkite/scripts/bootstrap.sh
fi

# ---- Change detection -------------------------------------------------------

if [[ -n "${BASE_REF:-}" ]]; then
  base_ref="$BASE_REF"
elif [[ -n "${BUILDKITE_COMMIT:-}" ]]; then
  base_ref="${BUILDKITE_COMMIT}^"
else
  base_ref="HEAD^"
fi

CONSOLE_DIR="src/platform/plugins/shared/console"

# Pipeline infrastructure files, a change here rebuilds regardless of source diff.
PIPELINE_FILES=(
  ".buildkite/pipelines/console_packaging_publish.yml"
  ".buildkite/scripts/steps/console_packaging_publish.sh"
  ".buildkite/pipeline-resource-definitions/kibana-console-packaging-publish.yml"
)

report_step "Detect changes (base=$base_ref)"

if [[ "${FORCE_ALL:-}" == "1" ]]; then
  do_build=1
  echo "FORCE_ALL=1 — building unconditionally."
else
  # Console source changes, excluding server/, test/, and build artifacts.
  console_changed="$(git diff --name-only "$base_ref" HEAD -- "$CONSOLE_DIR/" |
    grep -v "^${CONSOLE_DIR}/test/" |
    grep -v "^${CONSOLE_DIR}/server/" |
    grep -v "^${CONSOLE_DIR}/packaging/target/" || true)"

  # Pipeline file changes also trigger a rebuild.
  pipeline_changed="$(git diff --name-only "$base_ref" HEAD -- "${PIPELINE_FILES[@]}" || true)"

  if [[ -n "$console_changed" || -n "$pipeline_changed" ]]; then
    do_build=1
    echo "Changed files:"
    if [[ -n "$console_changed" ]]; then
      echo "$console_changed" | sed 's/^/  - /'
    fi
    if [[ -n "$pipeline_changed" ]]; then
      echo "$pipeline_changed" | sed 's/^/  - /'
    fi
  else
    do_build=0
  fi
fi

if [[ "${do_build:-0}" == "0" ]]; then
  echo "No relevant console changes detected. Exiting."
  exit 0
fi

# ---- Build ------------------------------------------------------------------

PACKAGING_DIR="$KIBANA_ROOT/$CONSOLE_DIR/packaging"
TARGET_DIR="$PACKAGING_DIR/target"

if [[ "${SKIP_BUILD:-}" == "1" ]]; then
  report_step "Build @kbn/one-console (skipped via SKIP_BUILD=1)"
else
  report_step "Build @kbn/one-console"
  "$PACKAGING_DIR/scripts/build.sh"
fi

# ---- Prepare tarball --------------------------------------------------------

report_step "Prepare tarball"

# Write a publish-ready package.json into target/: fix the relative paths that
# point from packaging/ -> target/ (../target/index.js) to paths relative to
# where the file will live inside the tarball (./index.js).
node -e "
  const fs = require('fs');
  const src = JSON.parse(fs.readFileSync('$PACKAGING_DIR/package.json', 'utf8'));
  src.main = './index.js';
  src.types = './index.d.ts';
  delete src.private;
  fs.writeFileSync('$TARGET_DIR/package.json', JSON.stringify(src, null, 2) + '\n');
"

GIT_HASH="${BUILDKITE_COMMIT:-$(git rev-parse HEAD)}"
VERSION="0.0.0-${GIT_HASH:0:12}"

node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('$TARGET_DIR/package.json', 'utf8'));
  p.version = '$VERSION';
  fs.writeFileSync('$TARGET_DIR/package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('  ' + p.name + '@' + p.version);
"

rm -f "$TARGET_DIR"/*.tgz
(cd "$TARGET_DIR" && npm pack --pack-destination "$TARGET_DIR" > /dev/null)
TARBALL="$(ls -t "$TARGET_DIR"/*.tgz | head -1)"

if [[ -z "$TARBALL" ]]; then
  echo "ERROR: no tarball produced." >&2
  exit 1
fi

echo "Tarball: $(basename "$TARBALL")"

# ---- Publish ----------------------------------------------------------------

if [[ "${DRY_RUN:-}" == "1" ]]; then
  report_step "DRY_RUN=1 — skipping publish. Built tarball:"
  echo "  $TARBALL"
  exit 0
fi

report_step "Fetching Artifactory credentials"
NPM_REGISTRY="$(vault_get kbn-ui-artifactory registry)"
NPM_TOKEN="$(vault_get kbn-ui-artifactory npm_token)"
if [[ -z "$NPM_REGISTRY" || -z "$NPM_TOKEN" ]]; then
  echo "ERROR: Artifactory credentials missing from vault." >&2
  exit 1
fi

NPMRC="$(mktemp)"
trap 'rm -f "$NPMRC"' EXIT
REGISTRY_HOST="${NPM_REGISTRY#https:}"
REGISTRY_HOST="${REGISTRY_HOST#http:}"
cat > "$NPMRC" <<EOF
@kbn:registry=${NPM_REGISTRY}
${REGISTRY_HOST}:_authToken=${NPM_TOKEN}
always-auth=true
EOF

PKG_MANIFEST="$TARGET_DIR/package.json"

report_step "Publishing $(basename "$TARBALL") → $NPM_REGISTRY"
npm publish "$TARBALL" --tag latest --userconfig "$NPMRC" || {
  publish_rc=$?
  if npm view "$(node -p "require('$PKG_MANIFEST').name")@$(node -p "require('$PKG_MANIFEST').version")" \
       --userconfig "$NPMRC" >/dev/null 2>&1; then
    echo "Already published at this version — no-op."
  else
    exit $publish_rc
  fi
}

report_step "Done"
