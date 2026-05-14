#!/usr/bin/env bash
set -euo pipefail

# Publish pipeline for @kbn/ui-* packages.
#
# Detect which packages under src/platform/kbn-ui/ were affected by the
# commit range, run each one's packaging build, and npm-publish the
# resulting tarball to the internal Artifactory registry.
#
# Content-hash versioning (baked into each package's build.sh) means
# identical inputs produce identical versions, so the registry naturally
# refuses duplicate publishes.
#
# Env overrides:
#   DRY_RUN=1         — build everything but skip the publish step.
#   BASE_REF=<ref>    — override the git base used for change detection.
#   FORCE_ALL=1       — publish every kbn-ui package regardless of diff.
#   SKIP_BOOTSTRAP=1  — skip `yarn kbn bootstrap` (local re-runs).

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

# ---- Change detection ------------------------------------------------------

# On a standard "merge to main" build, the commit under test is a merge or
# fast-forward; the safe default base is its first parent. On manual triggers
# or local runs, BASE_REF can override.
if [[ -n "${BASE_REF:-}" ]]; then
  base_ref="$BASE_REF"
elif [[ -n "${BUILDKITE_COMMIT:-}" ]]; then
  base_ref="${BUILDKITE_COMMIT}^"
else
  base_ref="HEAD^"
fi

report_step "Detect affected packages (base=$base_ref)"

if [[ "${FORCE_ALL:-}" == "1" ]]; then
  affected="$(find src/platform/kbn-ui -mindepth 1 -maxdepth 1 -type d \
    ! -name '_*' -exec basename {} \;)"
else
  affected="$(src/platform/kbn-ui/_tooling/affected_packages.sh "$base_ref" HEAD)"
fi

if [[ -z "$affected" ]]; then
  echo "No kbn-ui packages affected in this range. Exiting."
  exit 0
fi

echo "Affected packages:"
echo "$affected" | sed 's/^/  - /'

# ---- Build each affected package ------------------------------------------

built_tarballs=()
while IFS= read -r pkg; do
  [[ -z "$pkg" ]] && continue
  pkg_dir="src/platform/kbn-ui/$pkg"
  build_script="$pkg_dir/packaging/scripts/build.sh"

  if [[ ! -x "$build_script" ]]; then
    echo "Skipping $pkg — no packaging/scripts/build.sh"
    continue
  fi

  report_step "Build $pkg"
  "$build_script"

  tarball="$(ls -t "$pkg_dir/target"/*.tgz | head -1)"
  if [[ -z "$tarball" ]]; then
    echo "ERROR: no tarball produced for $pkg" >&2
    exit 1
  fi
  built_tarballs+=("$tarball")
done <<< "$affected"

# ---- Publish --------------------------------------------------------------

if [[ "${DRY_RUN:-}" == "1" ]]; then
  report_step "DRY_RUN=1 — skipping publish. Built tarballs:"
  printf '  %s\n' "${built_tarballs[@]}"
  exit 0
fi

report_step "Fetching Artifactory credentials"
# The secret is stored at `kv/ci-shared/serverless/cloud-ui/kbn-ui-artifactory-registry`,
# so that engineering orgs and CIs from kibana and cloud-ui can both access it without
# granting broader vault permissions.
# Secret layout:
#   registry   - full npm registry URL
#   npm_token  - auth token
NPM_REGISTRY="$(vault_kv_get kv/ci-shared/serverless/cloud-ui/kbn-ui-artifactory-registry registry_url)"
NPM_TOKEN="$(vault_kv_get kv/ci-shared/serverless/cloud-ui/kbn-ui-artifactory-registry npm_token)"
if [[ -z "$NPM_REGISTRY" || -z "$NPM_TOKEN" ]]; then
  echo "ERROR: Artifactory credentials missing from vault." >&2
  exit 1
fi

# Scoped .npmrc for this run only; cleaned up on exit.
NPMRC="$(mktemp)"
trap 'rm -f "$NPMRC"' EXIT
REGISTRY_HOST="${NPM_REGISTRY#https:}"
REGISTRY_HOST="${REGISTRY_HOST#http:}"
cat > "$NPMRC" <<EOF
@kbn:registry=${NPM_REGISTRY}
${REGISTRY_HOST}:_authToken=${NPM_TOKEN}
always-auth=true
EOF

for tarball in "${built_tarballs[@]}"; do
  target_dir="$(cd "$(dirname "$tarball")" && pwd)"
  pkg_manifest="$target_dir/package.json"

  # The workspace manifest marks the package `"private": true` to prevent
  # accidental publishes to public npm. Strip that flag just for the tarball
  # we're about to push, without touching the source manifest.
  report_step "Preparing $(basename "$tarball") for publish"
  node -e "
    const fs = require('fs');
    const p = require('$pkg_manifest');
    delete p.private;
    fs.writeFileSync('$pkg_manifest', JSON.stringify(p, null, 2) + '\n');
  "

  # Re-pack so the tarball reflects the stripped manifest.
  rm -f "$target_dir"/*.tgz
  (cd "$target_dir" && npm pack --pack-destination "$target_dir" >/dev/null)
  new_tarball="$(ls -t "$target_dir"/*.tgz | head -1)"

  report_step "Publishing $(basename "$new_tarball") → $NPM_REGISTRY"
  # --userconfig isolates our .npmrc from any global one.
  # Capture the exit code before any `if`/`!` negation changes $?.
  # A 409 (already published with this version) is the expected no-op
  # for a content-hash-versioned artifact that hasn't changed. Convert
  # that into a success; anything else is still fatal.
  npm publish "$new_tarball" --tag latest --userconfig "$NPMRC" || {
    publish_rc=$?
    if npm view "$(node -p "require('$pkg_manifest').name")@$(node -p "require('$pkg_manifest').version")" \
         --userconfig "$NPMRC" >/dev/null 2>&1; then
      echo "Already published at this version — no-op."
    else
      exit $publish_rc
    fi
  }
done

report_step "Done"
