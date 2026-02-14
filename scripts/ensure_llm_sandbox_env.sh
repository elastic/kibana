#!/usr/bin/env bash
# Sets up the development environment for AI coding agents running in
# sandboxed shells (Cursor, Codex, Claude Code).
#
# It is intended to be *sourced* (not executed) before running any yarn/node
# commands.
#
# Usage:
#   source scripts/ensure_llm_sandbox_env.sh && yarn kbn bootstrap
#
# What it does:
#   1. Tries to load nvm and activate the Node.js version from .nvmrc.
#      If nvm is not installed, sets UNSAFE_DISABLE_NODE_VERSION_VALIDATION=1
#      as a fallback so commands can still run.
#   2. Disables the LMDB-backed babel register cache (native module uses mmap
#      which is blocked by most sandboxes, causing SIGABRT).
#   3. Disables ci-stats reporting (sandbox blocks outbound network, causing
#      long retries after test runs).

_ensure_llm_sandbox_env() {
  local repo_root
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  # --- Node.js version (nvm) ---
  if ! command -v nvm &>/dev/null; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
      # shellcheck disable=SC1091
      . "$NVM_DIR/nvm.sh"
    fi
  fi

  if command -v nvm &>/dev/null; then
    nvm install 2>/dev/null
    nvm use 2>/dev/null
  else
    echo "WARNING: nvm is not installed. Cannot switch to Node.js $(cat "$repo_root/.nvmrc")." >&2
    echo "Setting UNSAFE_DISABLE_NODE_VERSION_VALIDATION=1 as a workaround." >&2
    echo "For best results, install nvm: https://github.com/nvm-sh/nvm#installing-and-updating" >&2
    export UNSAFE_DISABLE_NODE_VERSION_VALIDATION=1
  fi

  # --- Sandbox-incompatible native modules ---
  # LMDB (used by @kbn/babel-register cache) requires mmap, which most
  # sandboxes block. Disabling the cache avoids a fatal SIGABRT.
  export DISABLE_BABEL_REGISTER_CACHE=1

  # --- Network-dependent services ---
  # ci-stats reporter retries for ~100s when the network is blocked.
  export CI_STATS_DISABLED=true
}

_ensure_llm_sandbox_env
unset -f _ensure_llm_sandbox_env
