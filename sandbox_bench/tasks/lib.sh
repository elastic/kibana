#!/usr/bin/env bash
# Shared helpers for sandbox benchmark tasks. The runner prepends this file to
# every task script, so tasks may assume these functions and variables exist.
set -euo pipefail

KIBANA_REPO="${KIBANA_REPO:-https://github.com/elastic/kibana.git}"
KIBANA_REF="${KIBANA_REF:-main}"
KIBANA_DIR="${KIBANA_DIR:-$HOME/kibana}"
CLONE_MODE="${CLONE_MODE:-shallow}"
NVM_VERSION="${NVM_VERSION:-v0.39.1}"

bench_phase() {
  echo "##BENCH## phase=$1 t=$(date +%s%3N)"
}

bench_kv() {
  echo "##BENCH## kv $1=$2"
}

bench_fail() {
  echo "##BENCH## fail reason=$1"
  exit 1
}

# wait_for_http <url> <timeout_seconds> [accepted_status_regex]
# Polls until the URL answers with an accepted HTTP status (default 2xx/3xx/401).
wait_for_http() {
  local url="$1" timeout="$2" accept="${3:-^(2..|3..|401)$}" start code
  start=$SECONDS
  while true; do
    code=$(curl -sk -o /dev/null -m 5 -w '%{http_code}' "$url" || echo 000)
    if [[ "$code" =~ $accept ]]; then
      return 0
    fi
    if (( SECONDS - start > timeout )); then
      bench_kv last_http_code "$code"
      return 1
    fi
    sleep 2
  done
}

ensure_repo() {
  if [[ -f "$KIBANA_DIR/package.json" ]]; then
    return 0
  fi
  bench_phase clone_start
  local args=()
  case "$CLONE_MODE" in
    shallow) args=(--depth 1 --single-branch) ;;
    treeless) args=(--filter=tree:0 --single-branch) ;;
    full) args=() ;;
    *) bench_fail "unknown_clone_mode_$CLONE_MODE" ;;
  esac
  git clone "${args[@]}" --branch "$KIBANA_REF" "$KIBANA_REPO" "$KIBANA_DIR" \
    || bench_fail clone_failed
  bench_phase clone_done
  bench_kv clone_mode "$CLONE_MODE"
  bench_kv git_head "$(git -C "$KIBANA_DIR" rev-parse HEAD)"
  bench_kv repo_size_kb "$(du -sk "$KIBANA_DIR" | cut -f1)"
}

# Installs the exact Node version from .node-version (via nvm, mirroring
# .devcontainer/Dockerfile) plus yarn 1.x, unless already correct.
ensure_toolchain() {
  local want have
  want="$(cat "$KIBANA_DIR/.node-version")"
  have="$(command -v node >/dev/null 2>&1 && node -v || echo none)"
  bench_phase toolchain_start
  if [[ "$have" != "v$want" ]]; then
    export NVM_DIR="$HOME/.nvm"
    if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
      mkdir -p "$NVM_DIR"
      curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash \
        || bench_fail nvm_install_failed
    fi
    # nvm is not set -u clean
    set +u
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm install "$want" >/dev/null || bench_fail node_install_failed
    nvm use "$want" >/dev/null
    set -u
  fi
  command -v yarn >/dev/null 2>&1 || npm install -g yarn >/dev/null || bench_fail yarn_install_failed
  bench_phase toolchain_done
  bench_kv node_version "$(node -v)"
  bench_kv yarn_version "$(yarn -v)"
}

ensure_bootstrap() {
  if [[ -d "$KIBANA_DIR/node_modules/.yarn-integrity" || -f "$KIBANA_DIR/node_modules/.yarn-integrity" ]]; then
    return 0
  fi
  bench_phase bootstrap_start
  (cd "$KIBANA_DIR" && yarn kbn bootstrap) || bench_fail bootstrap_failed
  bench_phase bootstrap_done
  bench_kv node_modules_size_kb "$(du -sk "$KIBANA_DIR/node_modules" | cut -f1)"
}
