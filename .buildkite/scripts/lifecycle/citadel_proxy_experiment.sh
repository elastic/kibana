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
#   CITADEL_EXP_PROBE_SHASUMS=true   fetch node's SHASUMS256.txt both directly and
#                                    through the proxy and compare the bytes. Runs
#                                    before any other switch, so it works in either
#                                    arm. Diagnoses the build_kibana failure
#                                    "sha256 checksum of ... not provided".
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

  # --- Probe: does a response body survive the proxy intact? -----------------
  # Placed before every other switch so it runs in either arm. The build_kibana
  # failure is "sha256 checksum of <node tarball> not provided": getNodeShasums
  # fetches SHASUMS256.txt (200 OK, no error), then parses it with
  # `split('\n')` + `split('  ')`. A body that arrives with CRLF endings, or
  # altered in any other way, yields keys that no longer match the tarball name.
  # This dumps enough to tell which.
  if [[ "${CITADEL_EXP_PROBE_SHASUMS:-}" == "true" ]]; then
    local nv="24.18.0"
    if [[ -f .node-version ]]; then
      nv="$(tr -d '[:space:]' < .node-version)"
    fi
    local base="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache"
    local expect="node-v${nv}-linux-x64.tar.gz"
    echo "--- Citadel probe: SHASUMS256.txt (node v${nv}, expecting key '${expect}')"
    local variant label
    for variant in "" "node-glibc-217/"; do
      # Strip the trailing slash: it is part of the URL path, but would turn the
      # temp file name into a non-existent directory.
      label="${variant%/}"
      label="${label:-plain}"
      echo "url: ${base}/${variant}dist/v${nv}/SHASUMS256.txt"
      _citadel_probe_url direct "${label}" "${base}/${variant}dist/v${nv}/SHASUMS256.txt" "${expect}" || true
      _citadel_probe_url proxied "${label}" "${base}/${variant}dist/v${nv}/SHASUMS256.txt" "${expect}" || true
      if diff -q "${_CITADEL_PROBE_DIR}/direct-${label}.body" \
                 "${_CITADEL_PROBE_DIR}/proxied-${label}.body" > /dev/null 2>&1; then
        echo "  => bodies IDENTICAL"
      else
        echo "  => bodies DIFFER"
      fi
    done
    applied="${applied}probe-shasums "
  fi

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
    _citadel_annotate "${applied}unproxy"
    return 0
  fi

  # --- Confirmed bypasses ----------------------------------------------------
  # Applied unconditionally, not behind a flag: a PR build is triggered
  # automatically and cannot carry build-level env vars. Everything here is
  # evidence-backed — a specific build demonstrates the failure — as opposed to
  # the candidate list below. Each of these must also land in
  # vault-buildkite-plugin hooks/environment and be recorded in
  # citadel-proxy docs/ci-egress-proxy.md.
  #
  # us-central1-elastic-kibana-184716.cloudfunctions.net
  #   Kibana CI binary cache: CHROMEDRIVER_CDNURL / GECKODRIVER_CDNURL /
  #   CYPRESS_DOWNLOAD_MIRROR, and node's SHASUMS256.txt + tarballs.
  #   Proxied, build_kibana fails deterministically in DownloadNodeBuilds with
  #   "sha256 checksum of ...node-<ver>-linux-x64.tar.gz not provided"
  #   (flaky-test-suite-runner 13513 and 13517; passes with the proxy blanked,
  #   13510). curl through the same proxy in the same job returns byte-identical
  #   correct content, so the fault is client-side rather than on the wire —
  #   tracked separately, this is the unblock.
  #   Static hostname: elastic-kibana-184716 is the GCP project id and
  #   us-central1 is where the Cloud Function is deployed. Agent region and build
  #   vary in the URL path, not the host, so one entry covers every region.
  local confirmed=(
    us-central1-elastic-kibana-184716.cloudfunctions.net
  )
  local bypass_host
  for bypass_host in "${confirmed[@]}"; do
    NO_PROXY="${NO_PROXY:+${NO_PROXY},}${bypass_host},.${bypass_host}"
  done
  export NO_PROXY
  export no_proxy="${NO_PROXY}"
  echo "NO_PROXY extended (confirmed): ${confirmed[*]}"
  applied="${applied}confirmed-bypass "

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

# Fetch one URL direct or via the proxy and report what could explain a body that
# arrives subtly different.
#
# The endpoint 301-redirects to storage.googleapis.com, which is in NO_PROXY — so
# the chain crosses the proxy boundary: hop 1 goes through Squid, hop 2 goes direct.
# The 301 carries no Cache-Control and no Expires, which makes it heuristically
# cacheable, and Squid has caching enabled. So the first thing to compare is the
# Location of hop 1, not the final body: a stale cached 301 would point at a
# different GCS object and yield a valid SHASUMS256.txt for the wrong node version,
# which is exactly what "checksum not provided" looks like.
#
# Two requests on purpose: one without -L to capture the redirect, one with -L for
# the body Axios would actually have parsed. openssl rather than sha256sum so this
# also runs on a mac while iterating.
_CITADEL_PROBE_DIR=/tmp/citadel-probe

_citadel_probe_url() {
  local mode="$1" label="$2" url="$3" expect="$4"
  mkdir -p "${_CITADEL_PROBE_DIR}"
  local body="${_CITADEL_PROBE_DIR}/${mode}-${label}.body"
  local hdr="${_CITADEL_PROBE_DIR}/${mode}-${label}.hdr"
  local -a args=(-sS --max-time 60)

  : > "${body}" || true
  : > "${hdr}" || true

  if [[ "${mode}" == "direct" ]]; then
    args+=(--noproxy '*')
  else
    args+=(-x "${HTTPS_PROXY}")
  fi

  # Hop 1 only — what does the redirect point at?
  if ! curl "${args[@]}" -o /dev/null -D "${hdr}" "${url}"; then
    echo "  ${mode}: curl FAILED on hop 1"
    return 0
  fi
  local status location age xcache
  # Last HTTP status line, not the first: through a proxy the dump starts with
  # curl's own "HTTP/1.1 200 Connection established" CONNECT reply.
  status="$(grep -E '^HTTP/' "${hdr}" | tail -1 | awk '{print $2}' | tr -d '\r')"
  location="$(grep -i '^location:' "${hdr}" | tr -d '\r' | cut -d' ' -f2- || echo '<none>')"
  age="$(grep -i '^age:' "${hdr}" | tr -d '\r' || echo 'age: <none>')"
  xcache="$(grep -iE '^(x-cache|x-cache-lookup|via):' "${hdr}" | tr -d '\r' | paste -sd' ' - || echo '<no squid headers>')"
  echo "  ${mode}: hop1_status=${status}"
  echo "  ${mode}: location=${location}"
  echo "  ${mode}: ${age} | ${xcache}"

  # Full chain — the body Kibana would have parsed.
  local final code
  final="$(curl "${args[@]}" -L -o "${body}" -w '%{url_effective} %{http_code} %{num_redirects}' "${url}" || echo 'FAILED 000 0')"
  code="$(echo "${final}" | awk '{print $2}')"
  echo "  ${mode}: final_url=$(echo "${final}" | awk '{print $1}')"

  local size digest crs keymatch
  size="$(wc -c < "${body}" | tr -d ' ')"
  digest="$(openssl dgst -sha256 < "${body}" | awk '{print $NF}')"
  crs="$(tr -cd '\r' < "${body}" | wc -c | tr -d ' ')"
  if grep -qx "[0-9a-f]\{64\}  ${expect}" "${body}"; then keymatch="MATCH"; else keymatch="MISSING"; fi
  echo "  ${mode}: final_status=${code} bytes=${size} sha256=${digest:0:16}… cr_bytes=${crs} key=${keymatch}"
  echo "  ${mode}: first line bytes:"
  head -1 "${body}" | od -c | head -2 | sed 's/^/    /'
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
