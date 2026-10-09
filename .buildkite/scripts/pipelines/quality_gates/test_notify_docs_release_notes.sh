#!/usr/bin/env bash
#
# Tests notify_docs_release_notes.sh with a stub buildkite-agent. Run it from anywhere:
#   .buildkite/scripts/test-notify_docs_release_notes.sh

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
script="${here}/notify_docs_release_notes.sh"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

# The stub answers `step get outcome --step <key>` from OUTCOME_<key with - as _>, and records
# the other calls.
mkdir -p "${work}/bin"
cat > "${work}/bin/buildkite-agent" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  step)
    key="${5//-/_}"
    var="OUTCOME_${key}"
    [[ -n "${!var:-}" ]] || { echo "no such step: $5" >&2; exit 1; }
    echo "${!var}"
    ;;
  pipeline) cat > "${STUB_DIR}/uploaded.yml" ;;
  annotate) echo "$*" > "${STUB_DIR}/annotation.txt" ;;
  *) echo "unexpected call: $*" >&2; exit 2 ;;
esac
STUB
chmod +x "${work}/bin/buildkite-agent"

failures=0
# run <name> <expected exit> <uploaded yes|no> <command...>; the environment is set by the caller.
run() {
  local name="$1" want_exit="$2" want_upload="$3"
  shift 3
  rm -f "${work}/uploaded.yml" "${work}/annotation.txt"
  local got_exit=0
  PATH="${work}/bin:${PATH}" STUB_DIR="${work}" "$@" > "${work}/out.txt" 2>&1 || got_exit=$?
  local got_upload=no
  [[ -f "${work}/uploaded.yml" ]] && got_upload=yes
  if [[ "${got_exit}" != "${want_exit}" || "${got_upload}" != "${want_upload}" ]]; then
    echo "FAIL ${name}: exit ${got_exit} (want ${want_exit}), uploaded ${got_upload} (want ${want_upload})"
    sed 's/^/  | /' "${work}/out.txt"
    failures=$((failures + 1))
  else
    echo "ok   ${name}"
  fi
}

export SERVICE_VERSION=ecabf1e17c60aaaaaaaaaaaaaaaaaaaaaaaaaaaa ENVIRONMENT=production-noncanary
export DEPLOYMENT_SLICES="production-noncanary-ds-1, production-noncanary-ds-5"

OUTCOME_gate_a=passed OUTCOME_gate_b=passed run "all steps passed" 0 yes "${script}" kibana gate-a gate-b
grep -q 'SERVICE_VERSION: ecabf1e17c60$' "${work}/uploaded.yml" || { echo "FAIL version is cut to 12 characters"; failures=$((failures + 1)); }
grep -q 'SERVICE: kibana$' "${work}/uploaded.yml" || { echo "FAIL service in the upload"; failures=$((failures + 1)); }
grep -q 'trigger: docs-release-notes' "${work}/uploaded.yml" || { echo "FAIL trigger in the upload"; failures=$((failures + 1)); }

OUTCOME_gate_a=passed OUTCOME_gate_b=soft_failed run "one step soft failed" 0 no "${script}" kibana gate-a gate-b
grep -q 'gate-b (soft_failed)' "${work}/annotation.txt" || { echo "FAIL annotation names the step"; failures=$((failures + 1)); }
OUTCOME_gate_a=hard_failed run "a step hard failed" 0 no "${script}" elasticsearch gate-a
OUTCOME_gate_a=passed run "unknown step key" 1 no "${script}" kibana gate-a missing-step
OUTCOME_gate_a=passed run "unknown service" 1 no "${script}" cloud gate-a
OUTCOME_gate_a=passed run "no step keys" 1 no "${script}" kibana
OUTCOME_gate_a=passed SERVICE_VERSION=latest run "bad version" 1 no "${script}" kibana gate-a
OUTCOME_gate_a=passed SERVICE_VERSION= run "empty version" 1 no "${script}" kibana gate-a
OUTCOME_gate_a=passed DEPLOYMENT_SLICES=$'x"\nsteps: []' run "slices with a newline or quote" 1 no "${script}" kibana gate-a
OUTCOME_gate_a=passed ENVIRONMENT="a b" run "environment with a space" 1 no "${script}" kibana gate-a

if [[ "${failures}" -gt 0 ]]; then
  echo "${failures} check(s) failed"
  exit 1
fi
echo "All checks passed"
