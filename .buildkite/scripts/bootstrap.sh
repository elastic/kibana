#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# TODO(yarn-to-pnpm): temporary bootstrap structure diagnostics. Snapshots the
# node_modules structure (baked starting point + after bootstrap) and the agent
# image marker (~/kibana-image-info.txt), uploaded under bootstrap_diag/. On the
# build step it additionally does a clean (rm -rf node_modules) rebootstrap to
# compare structures. Enabled on the build step, FTR config steps, or when
# BOOTSTRAP_DIAG=1. The clean-rebootstrap phase is build-step only (or
# BOOTSTRAP_DIAG_CLEAN=1) to avoid doubling bootstrap across 200+ FTR jobs.
# Never fails the build. Remove before merge.
DIAG_ENABLED=""
if [[ "${BOOTSTRAP_DIAG:-}" || "${BUILDKITE_STEP_KEY:-}" == "build" || "${BUILDKITE_STEP_KEY:-}" == ftr_configs* ]]; then
  DIAG_ENABLED="true"
fi
DIAG_CLEAN=""
if [[ "$DIAG_ENABLED" && ( "${BOOTSTRAP_DIAG_CLEAN:-}" || "${BUILDKITE_STEP_KEY:-}" == "build" ) ]]; then
  DIAG_CLEAN="true"
fi
DIAG_DIR="${KIBANA_DIR:-$(pwd)}/bootstrap_diag"

# Capture the agent image marker baked into the -qa image (~/kibana-image-info.txt).
if [[ "$DIAG_ENABLED" ]]; then
  mkdir -p "$DIAG_DIR"
  if [[ -f "$HOME/kibana-image-info.txt" ]]; then
    echo "--- 🔬 kibana image info (~/kibana-image-info.txt)"
    cat "$HOME/kibana-image-info.txt" || true
    cp "$HOME/kibana-image-info.txt" "$DIAG_DIR/kibana-image-info.txt" || true
  else
    echo "🔬 ~/kibana-image-info.txt not present on this agent"
  fi
fi

map_node_modules() {
  local phase="$1"
  [[ "$DIAG_ENABLED" ]] || return 0
  mkdir -p "$DIAG_DIR"
  local summary="$DIAG_DIR/${phase}.summary.txt"
  local tree="$DIAG_DIR/${phase}.tree.txt"

  {
    echo "phase:  $phase"
    echo "time:   $(date -u +%FT%TZ)"
    echo "pwd:    $(pwd)"
    echo "node:   $(node --version 2>/dev/null)  pnpm: $(pnpm --version 2>/dev/null)"
    if [[ -d node_modules ]]; then
      echo "node_modules du:         $(du -sh node_modules 2>/dev/null | cut -f1)"
      echo "top-level entries:       $(find node_modules -maxdepth 1 -mindepth 1 2>/dev/null | wc -l | tr -d ' ')"
      echo "package dirs (depth 2):  $(find node_modules -maxdepth 2 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
      echo ".pnpm dir:               $([[ -d node_modules/.pnpm ]] && echo present || echo MISSING)"
      echo ".modules.yaml:           $([[ -f node_modules/.modules.yaml ]] && echo present || echo MISSING)"
      echo "@elastic dirs:           $(ls node_modules/@elastic 2>/dev/null | wc -l | tr -d ' ')"
      echo "@kbn dirs:               $(ls node_modules/@kbn 2>/dev/null | wc -l | tr -d ' ')"
    else
      echo "node_modules:            MISSING"
    fi
    echo "expected @elastic/esql:  $(node -p "require('$PWD/package.json').dependencies['@elastic/esql']" 2>/dev/null || echo '?')"
    if [[ -f node_modules/@elastic/esql/package.json ]]; then
      echo "installed @elastic/esql: $(node -p "require('$PWD/node_modules/@elastic/esql/package.json').version" 2>/dev/null)"
    else
      echo "installed @elastic/esql: MISSING"
    fi
    echo "require.resolve probes:"
    node -e '
      for (const m of ["react", "antlr4", "@elastic/esql", "@elastic/esql-types", "@kbn/std", "@kbn/utils"]) {
        try { console.log("  OK   " + m + " -> " + require.resolve(m)); }
        catch (e) { console.log("  FAIL " + m + " (" + (e.code || e.message) + ")"); }
      }
    ' 2>&1 || true
  } | tee "$summary"

  # Full structure snapshot (top-level + one scope level) for diffing across phases.
  if [[ -d node_modules ]]; then
    find node_modules -maxdepth 2 -mindepth 1 \( -type d -o -type l \) -printf '%y %p -> %l\n' 2>/dev/null | sort >"$tree" ||
      find node_modules -maxdepth 2 -mindepth 1 2>/dev/null | sort >"$tree"
  fi
}

upload_diag() {
  [[ "$DIAG_ENABLED" && -d "$DIAG_DIR" ]] || return 0
  echo "--- 🔬 uploading bootstrap diagnostics"
  if command -v buildkite-agent >/dev/null 2>&1; then
    (cd "$(dirname "$DIAG_DIR")" && buildkite-agent artifact upload "bootstrap_diag/*") || true
  fi
}
trap upload_diag EXIT

echo "--- pnpm install and bootstrap"

BOOTSTRAP_PARAMS=()
if [[ "${BOOTSTRAP_ALWAYS_FORCE_INSTALL:-}" ]]; then
  BOOTSTRAP_PARAMS+=(--force-install)
fi

# Remove this once we have pnpm store in the agent cache
rm -rf ./node_modules

# Use packages baked into the agent image as a cache, but only when the workspace
# is not on local ssd or in memory — moving many small files between disks is
# slower than linking from the pnpm store.
if [[ "$(pwd)" != *"/local-ssd/"* && "$(pwd)" != "/dev/shm"* ]]; then
  if [[ -d ~/.kibana/node_modules ]]; then
    echo "Using ~/.kibana/node_modules as a starting point"
    mv ~/.kibana/node_modules ./
  fi
  if [[ -d ~/.kibana/pnpm-store ]]; then
    echo "Using ~/.kibana/pnpm-store as a starting point"
    mv ~/.kibana/pnpm-store ./.pnpm-store
  fi
  export npm_config_store_dir="$KIBANA_DIR/.pnpm-store"
  # Check if there's a cache artifact uploaded from a previous step
  if [[ -z "${KBN_BOOTSTRAP_NO_PREBUILT:-}" ]]; then
    if download_tmp_artifact moon-cache.tar.zst "$HOME" "$BUILDKITE_BUILD_ID" false; then
      echo "Found moon-cache.tar.zst artifact, extracting to ./.moon/cache"
      mkdir -p ./.moon/cache
      echo "Extracting moon-cache.tar.zst to ./.moon/cache"
      tar -xf ~/moon-cache.tar.zst -I zstd -C ./
    fi
    .buildkite/scripts/common/activate_service_account.sh --unset-impersonation
  fi
fi

# Phase 0: the baked node_modules we're about to bootstrap on top of.
map_node_modules "phase0-baked-starting-point"

# TODO: revisit the double bootstrap per attempt after removing Bazel and changing package manager.
if ! (pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}" || pnpm kbn bootstrap "${BOOTSTRAP_PARAMS[@]}"); then
  echo "bootstrap failed, trying again in 15 seconds"
  sleep 15

  # Most bootstrap failures will result in a problem inside node_modules that does not get fixed on the next bootstrap
  # So, we should just delete node_modules in between attempts
  rm -rf node_modules

  echo "--- pnpm install and bootstrap, attempt 2"
  pnpm kbn bootstrap --force-install || pnpm kbn bootstrap
fi

# Phase 1: node_modules produced by the normal (cache-reusing) bootstrap.
map_node_modules "phase1-after-bootstrap"

# Phase 2: clean bootstrap — remove node_modules and bootstrap from scratch to see
# whether the cache-reusing bootstrap produced a different (incomplete) structure.
# Build-step only (or BOOTSTRAP_DIAG_CLEAN=1); too expensive across 200+ FTR jobs.
if [[ "$DIAG_CLEAN" ]]; then
  echo "--- 🔬 clean bootstrap (rm -rf node_modules, bootstrap again)"
  rm -rf node_modules
  pnpm kbn bootstrap --force-install || pnpm kbn bootstrap || true
  map_node_modules "phase2-clean-bootstrap"
fi

if [[ "$DISABLE_BOOTSTRAP_VALIDATION" != "true" ]]; then
  check_for_changed_files 'pnpm kbn bootstrap'
fi

# Opt-in per job (via CLEAR_YARN_CACHE) to free disk space on disk-constrained agents
if [[ "${CLEAR_YARN_CACHE:-}" ]]; then
  echo "Clearing yarn cache at /opt/buildkite-agent/.cache/yar..."
  rm -rf /opt/buildkite-agent/.cache/yarn
  echo "Available disk space after clearing yarn cache:"
  df -h . || echo "Failed to get disk space"
fi
