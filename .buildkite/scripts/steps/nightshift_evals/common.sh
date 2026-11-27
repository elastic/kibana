#!/usr/bin/env bash

# Shared helpers for the nightshift-evals steps. Source it, do not run it.

NIGHTSHIFT_EVALS_REPO="${NIGHTSHIFT_EVALS_REPO:-elastic/nightshift-evals}"
NIGHTSHIFT_EVALS_REF="${NIGHTSHIFT_EVALS_REF:-main}"
# Outside the Kibana checkout, so a Kibana clean can not touch it.
NIGHTSHIFT_EVALS_DIR="${NIGHTSHIFT_EVALS_DIR:-$(dirname "$KIBANA_DIR")/nightshift-evals}"

# `uv` release installed by `nightshift_install_uv`, and the sha256 of its Linux tarballs. Change
# the version and both hashes together; a tarball that does not match its hash is never unpacked.
NIGHTSHIFT_UV_VERSION="0.9.5"
NIGHTSHIFT_UV_SHA256_X86_64="2cf10babba653310606f8b49876cfb679928669e7ddaa1fb41fb00ce73e64f66"
NIGHTSHIFT_UV_SHA256_AARCH64="9db0c2f6683099f86bfeea47f4134e915f382512278de95b2a0e625957594ff3"

# Installs the pinned `uv` into $1 and puts it on the PATH. The step holds the Vault config, the
# EIS key and GITHUB_TOKEN, so it downloads a release tarball and checks its hash instead of
# piping an installer script into a shell.
nightshift_install_uv() {
  local dest="$1" target expected tarball
  if [[ "$(uname -s)" != "Linux" ]]; then
    echo "The pinned uv is a Linux build; this is $(uname -s)" >&2
    return 1
  fi
  case "$(uname -m)" in
    x86_64) target="x86_64-unknown-linux-gnu"; expected="$NIGHTSHIFT_UV_SHA256_X86_64" ;;
    aarch64) target="aarch64-unknown-linux-gnu"; expected="$NIGHTSHIFT_UV_SHA256_AARCH64" ;;
    *) echo "No pinned uv for $(uname -m)" >&2; return 1 ;;
  esac

  mkdir -p "$dest"
  tarball="$dest/uv-${target}.tar.gz"
  curl -fsSL -o "$tarball" \
    "https://github.com/astral-sh/uv/releases/download/${NIGHTSHIFT_UV_VERSION}/uv-${target}.tar.gz"
  if ! echo "${expected}  ${tarball}" | sha256sum --check --status; then
    echo "uv ${NIGHTSHIFT_UV_VERSION} (${target}) does not match its pinned sha256" >&2
    rm -f "$tarball"
    return 1
  fi
  tar -xzf "$tarball" --strip-components=1 -C "$dest"
  rm -f "$tarball"
  export PATH="$dest:$PATH"
}

# Rewrite github.com URLs for this process tree only, so `uv` can fetch the private
# elastic-evals-sdk-python dependency without a token in a file or in a process argument.
nightshift_git_auth() {
  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "GITHUB_TOKEN is not set; cannot clone ${NIGHTSHIFT_EVALS_REPO}" >&2
    return 1
  fi
  export GIT_CONFIG_COUNT=1
  export GIT_CONFIG_KEY_0="url.https://x-access-token:${GITHUB_TOKEN}@github.com/.insteadOf"
  export GIT_CONFIG_VALUE_0="https://github.com/"
}

nightshift_clone() {
  nightshift_git_auth
  rm -rf "$NIGHTSHIFT_EVALS_DIR"
  git clone --quiet "https://github.com/${NIGHTSHIFT_EVALS_REPO}.git" "$NIGHTSHIFT_EVALS_DIR"
  git -C "$NIGHTSHIFT_EVALS_DIR" checkout --quiet "$NIGHTSHIFT_EVALS_REF"
  echo "nightshift-evals at $(git -C "$NIGHTSHIFT_EVALS_DIR" rev-parse HEAD)" >&2
}
