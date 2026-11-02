#!/usr/bin/env bash

# Shared helpers for the nightshift-evals steps. Source it, do not run it.

NIGHTSHIFT_EVALS_REPO="${NIGHTSHIFT_EVALS_REPO:-elastic/nightshift-evals}"
NIGHTSHIFT_EVALS_REF="${NIGHTSHIFT_EVALS_REF:-main}"
# Outside the Kibana checkout, so a Kibana clean can not touch it.
NIGHTSHIFT_EVALS_DIR="${NIGHTSHIFT_EVALS_DIR:-$(dirname "$KIBANA_DIR")/nightshift-evals}"

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
