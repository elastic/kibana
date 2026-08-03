#!/usr/bin/env bash
#
# TEMPORARY — Citadel proxy experiment harness.
# Tracking: https://github.com/elastic/platform-engineering-productivity/issues/3163
# Revert this file and its `source` line in pre_command.sh before this branch goes
# anywhere near merge. Nothing here should outlive the investigation.
#
# Sourced from .buildkite/hooks/pre-command, which runs *after* the
# vault-buildkite-plugin `environment` hook — so this can modify what that hook set
# (HTTP_PROXY / HTTPS_PROXY / NO_PROXY) without needing a change to the plugin.
#
# Every switch is read from the environment, so experiments can be flipped per build
# from the Buildkite UI without pushing a new commit:
#
#   CITADEL_EXP_UNPROXY_JOB=true     blank HTTP(S)_PROXY for this job, leaving CA
#                                    trust and all other proxy setup intact. Use this
#                                    first: it answers whether a failure is
#                                    proxy-mediated at all.
#   CITADEL_EXP_EXTRA_NO_PROXY=true  append the candidate bypass list to NO_PROXY.
#   CITADEL_EXP_PROXY_CHROME=true    also set the lowercase proxy vars, so Chromium
#                                    uses the proxy (it reads only lowercase, so it
#                                    bypasses the proxy entirely by default).
#   CITADEL_EXP_CHROME_CA=true       install the Citadel CA into Chrome's NSS db.
#                                    Only meaningful with CITADEL_EXP_PROXY_CHROME,
#                                    and note serverless FTR sets
#                                    acceptInsecureCerts: true, so Chrome ignores TLS
#                                    errors there regardless.

_citadel_experiment() {
  [[ "${USE_CITADEL_PROXY:-}" == "true" ]] || return 0

  local applied=""

  echo "--- Citadel proxy experiment"
  echo "job_id = ${BUILDKITE_JOB_ID:-unknown}"
  echo "region = ${BUILDKITE_AGENT_GCP_REGION:-unknown}"

  # The plugin falls back to running without the proxy if its own smoke test fails,
  # so a job can be opted in and still be unproxied. Say so loudly rather than let
  # someone read a passing run as a result.
  if [[ -z "${HTTPS_PROXY:-}" ]]; then
    echo "HTTPS_PROXY is unset — the plugin's proxy smoke test almost certainly failed."
    echo "This job is NOT proxied. Discard it as a data point."
    return 0
  fi

  echo "proxy  = configured"

  # --- Is the failure proxy-mediated at all? ---------------------------------
  # Highest-information single run. Everything else about the opted-in job stays
  # identical: CA installed, NODE_EXTRA_CA_CERTS set, NO_PROXY populated.
  #
  # Blanked rather than unset deliberately: Buildkite reliably propagates hook
  # environment *changes* to later phases, but propagation of *unsets* is
  # version-dependent, and a silently-failed unset would leave the original proxy
  # in place and quietly invalidate the run. Empty reads as "no proxy" for curl,
  # Node and Go.
  if [[ "${CITADEL_EXP_UNPROXY_JOB:-}" == "true" ]]; then
    export HTTP_PROXY="" HTTPS_PROXY="" http_proxy="" https_proxy=""
    echo "proxy variables blanked for this job"
    _citadel_annotate "unproxy"
    return 0
  fi

  # --- Candidate bypasses ----------------------------------------------------
  if [[ "${CITADEL_EXP_EXTRA_NO_PROXY:-}" == "true" ]]; then
    local extra=(
      telemetry-staging.elastic.co
      telemetry.elastic.co
      fake-cloud.elastic.co
      ci-stats.kibana.dev
      kibana-stats.elastic.dev
      kibana-coverage.elastic.dev
    )
    local host
    for host in "${extra[@]}"; do
      NO_PROXY="${NO_PROXY:+${NO_PROXY},}${host},.${host}"
    done
    export NO_PROXY
    export no_proxy="${NO_PROXY}"
    echo "NO_PROXY extended with: ${extra[*]}"
    applied="${applied}extra-no-proxy "
  fi

  # --- Put Chromium on the proxy --------------------------------------------
  if [[ "${CITADEL_EXP_PROXY_CHROME:-}" == "true" ]]; then
    export http_proxy="${HTTP_PROXY}"
    export https_proxy="${HTTPS_PROXY}"
    export no_proxy="${NO_PROXY:-}"
    echo "lowercase proxy variables set — Chromium will use the proxy"
    applied="${applied}proxy-chrome "
  fi

  # --- Chrome CA trust ------------------------------------------------------
  # Chrome on Linux reads NSS, not the system trust store, at
  # $HOME/.local/share/pki/nssdb (or $HOME/.pki/nssdb when that already exists).
  # Not sudo: the db has to be owned by the user Chrome runs as.
  if [[ "${CITADEL_EXP_CHROME_CA:-}" == "true" ]]; then
    local ca=/usr/local/share/ca-certificates/citadel-proxy-ca.crt
    if [[ ! -f "${ca}" ]]; then
      echo "CA not found at ${ca} — skipping Chrome CA setup"
    elif ! sudo apt-get install -y --no-install-recommends libnss3-tools > /dev/null 2>&1; then
      echo "libnss3-tools install failed — skipping Chrome CA setup"
    else
      local db
      for db in "${HOME}/.local/share/pki/nssdb" "${HOME}/.pki/nssdb"; do
        mkdir -p "${db}"
        if [[ ! -f "${db}/cert9.db" ]]; then
          certutil -d "sql:${db}" -N --empty-password || true
        fi
        certutil -d "sql:${db}" -A -t "C,," -n citadel-proxy-ca -i "${ca}" || true
      done
      echo "Citadel CA added to Chrome NSS databases (owner: $(id -un))"
      applied="${applied}chrome-ca "
    fi
  fi

  [[ -n "${applied}" ]] && _citadel_annotate "${applied}"
  return 0
}

# Warn on the build itself, so nobody mistakes an experiment run for default behaviour.
_citadel_annotate() {
  buildkite-agent annotate \
    --style warning \
    --context citadel-experiment \
    "Citadel experiment flags active: \`${1}\` — results are not representative of default behaviour." \
    > /dev/null 2>&1 || true
}

_citadel_experiment
