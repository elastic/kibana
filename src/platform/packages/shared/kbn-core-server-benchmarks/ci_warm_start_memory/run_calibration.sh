#!/usr/bin/env bash
#
# Download fixed warm-start calibration distributables, verify checksums, run the
# paired warm-start memory benchmark, and upload manifest/report artifacts.
#
# Orientation (left/right artifact pairing):
#   aa  fixed A vs fixed A (same-artifact control)
#   ab  fixed A vs regressed B (default historical pair)
#   ba  regressed B vs fixed A (reversed pair)
#
# Inputs:
#   --orientation aa|ab|ba
#     or KIBANA_CI_WARM_START_MEMORY_CALIBRATION_ORIENTATION
#   --seed <value>
#     or KIBANA_CI_WARM_START_MEMORY_SEED
#
# Keep artifact metadata in sync with calibration_artifacts.ts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../../.." && pwd)"

ORIENTATION="${KIBANA_CI_WARM_START_MEMORY_CALIBRATION_ORIENTATION:-ab}"
SEED="${KIBANA_CI_WARM_START_MEMORY_SEED:-}"
DRY_RUN=false

WORK_DIR="target/ci-warm-start-memory-bench"
MANIFEST_PATH="${WORK_DIR}/warm_start_calibration_manifest.json"
REPORT_PATH="${WORK_DIR}/warm_start_memory_regression_report.json"
LEFT_BUILD_DIR="${WORK_DIR}/left"
RIGHT_BUILD_DIR="${WORK_DIR}/right"
BENCH_CONFIG_PATH="src/platform/packages/shared/kbn-core-server-benchmarks/ci_warm_start_memory.benchmark.config.ts"
PIPELINE_SLUG="kibana-on-merge"
ARTIFACT_FILENAME="kibana-default.tar.zst"

A_BUILD_ID="019f94c0-d0d9-4944-84fc-27beda66beb7"
A_BUILD_NUMBER="104030"
A_COMMIT="c068037b308eaa40c835e1016392587e2680e914"
A_ARTIFACT_ID="019f94ce-f550-455f-aab2-e12c621e6221"
A_SHA1="04668f26ee720ff5f15af88188851e7382127c76"
A_SHA256="ca34fb9db6425c81c8c25b8aac382d9d39899fe2bdd57179f7aad13e8c272779"
A_BUILD_URL="https://buildkite.com/elastic/kibana-on-merge/builds/104030"

B_BUILD_ID="019f94c0-70a2-4080-9082-0837dd577955"
B_BUILD_NUMBER="104029"
B_COMMIT="f34aaebb053fee8e04cbb673551356e532819b8f"
B_ARTIFACT_ID="019f94cf-911f-4059-9a1c-af5a7f30a521"
B_SHA1="ae342f24aa51285ac5d7ea94de0a15ce1c202ad5"
B_SHA256="2e12f9a5fa18ebf59121ff9ee3d80cbdbd273c77d8f83ce189793f119a050ca2"
B_BUILD_URL="https://buildkite.com/elastic/kibana-on-merge/builds/104029"

usage() {
  cat <<'EOF'
Usage: run_calibration.sh [--orientation aa|ab|ba] [--seed <value>] [--dry-run]

Runs the Linux warm-start memory calibration using fixed kibana-on-merge
distributables. Writes manifest/report under target/ci-warm-start-memory-bench/.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --orientation)
      ORIENTATION="${2:?missing value for --orientation}"
      shift 2
      ;;
    --seed)
      SEED="${2:?missing value for --seed}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

resolve_orientation() {
  local orientation
  orientation="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"

  case "${orientation}" in
    aa)
      LEFT_BUILD_ID="${A_BUILD_ID}"
      LEFT_BUILD_NUMBER="${A_BUILD_NUMBER}"
      LEFT_COMMIT="${A_COMMIT}"
      LEFT_ARTIFACT_ID="${A_ARTIFACT_ID}"
      LEFT_SHA1="${A_SHA1}"
      LEFT_SHA256="${A_SHA256}"
      LEFT_BUILD_URL="${A_BUILD_URL}"
      RIGHT_BUILD_ID="${A_BUILD_ID}"
      RIGHT_BUILD_NUMBER="${A_BUILD_NUMBER}"
      RIGHT_COMMIT="${A_COMMIT}"
      RIGHT_ARTIFACT_ID="${A_ARTIFACT_ID}"
      RIGHT_SHA1="${A_SHA1}"
      RIGHT_SHA256="${A_SHA256}"
      RIGHT_BUILD_URL="${A_BUILD_URL}"
      SEED="${SEED:-calibration-linux-aa}"
      ;;
    ab)
      LEFT_BUILD_ID="${A_BUILD_ID}"
      LEFT_BUILD_NUMBER="${A_BUILD_NUMBER}"
      LEFT_COMMIT="${A_COMMIT}"
      LEFT_ARTIFACT_ID="${A_ARTIFACT_ID}"
      LEFT_SHA1="${A_SHA1}"
      LEFT_SHA256="${A_SHA256}"
      LEFT_BUILD_URL="${A_BUILD_URL}"
      RIGHT_BUILD_ID="${B_BUILD_ID}"
      RIGHT_BUILD_NUMBER="${B_BUILD_NUMBER}"
      RIGHT_COMMIT="${B_COMMIT}"
      RIGHT_ARTIFACT_ID="${B_ARTIFACT_ID}"
      RIGHT_SHA1="${B_SHA1}"
      RIGHT_SHA256="${B_SHA256}"
      RIGHT_BUILD_URL="${B_BUILD_URL}"
      SEED="${SEED:-calibration-linux-ab}"
      ;;
    ba)
      LEFT_BUILD_ID="${B_BUILD_ID}"
      LEFT_BUILD_NUMBER="${B_BUILD_NUMBER}"
      LEFT_COMMIT="${B_COMMIT}"
      LEFT_ARTIFACT_ID="${B_ARTIFACT_ID}"
      LEFT_SHA1="${B_SHA1}"
      LEFT_SHA256="${B_SHA256}"
      LEFT_BUILD_URL="${B_BUILD_URL}"
      RIGHT_BUILD_ID="${A_BUILD_ID}"
      RIGHT_BUILD_NUMBER="${A_BUILD_NUMBER}"
      RIGHT_COMMIT="${A_COMMIT}"
      RIGHT_ARTIFACT_ID="${A_ARTIFACT_ID}"
      RIGHT_SHA1="${A_SHA1}"
      RIGHT_SHA256="${A_SHA256}"
      RIGHT_BUILD_URL="${A_BUILD_URL}"
      SEED="${SEED:-calibration-linux-ba}"
      ;;
    *)
      echo "Invalid warm-start calibration orientation \"${1}\". Expected aa, ab, or ba." >&2
      exit 1
      ;;
  esac
}

verify_checksums() {
  local artifact_path="$1"
  local expected_sha1="$2"
  local expected_sha256="$3"
  local artifact_id="$4"

  local computed_sha1 computed_sha256
  computed_sha1="$(shasum -a 1 "${artifact_path}" | awk '{print $1}')"
  computed_sha256="$(shasum -a 256 "${artifact_path}" | awk '{print $1}')"

  if [[ "${computed_sha1}" != "${expected_sha1}" ]]; then
    echo "SHA-1 mismatch for artifact ${artifact_id}: expected ${expected_sha1}, got ${computed_sha1}" >&2
    exit 1
  fi

  if [[ "${computed_sha256}" != "${expected_sha256}" ]]; then
    echo "SHA-256 mismatch for artifact ${artifact_id}: expected ${expected_sha256}, got ${computed_sha256}" >&2
    exit 1
  fi
}

download_side_artifact() {
  local side="$1"
  local build_id="$2"
  local artifact_id="$3"
  local expected_sha1="$4"
  local expected_sha256="$5"
  local stage_dir="$6"
  local artifact_path="$7"
  local extract_dir="$8"

  echo "--- Download ${side} artifact (${artifact_id}) from build ${build_id}"
  rm -rf "${stage_dir}" "${extract_dir}"
  mkdir -p "${stage_dir}" "${extract_dir}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] would download ${ARTIFACT_FILENAME} to ${artifact_path}"
    return 0
  fi

  if declare -F download_tmp_artifact >/dev/null; then
    download_tmp_artifact "${ARTIFACT_FILENAME}" "${stage_dir}" "${build_id}"
    mv "${stage_dir}/${ARTIFACT_FILENAME}" "${artifact_path}"
  elif command -v bk >/dev/null 2>&1; then
    local download_url
    download_url="$(
      bk api "/pipelines/${PIPELINE_SLUG}/builds/${build_id}/artifacts" \
        | node -e "
          const artifacts = JSON.parse(require('fs').readFileSync(0, 'utf8'));
          const match = artifacts.find((artifact) => artifact.id === process.argv[1]);
          if (!match) {
            console.error('Artifact not found: ' + process.argv[1]);
            process.exit(1);
          }
          process.stdout.write(match.download_url);
        " "${artifact_id}"
    )"
    curl -fsSL "${download_url}" -o "${artifact_path}"
  else
    echo "Neither download_tmp_artifact nor bk is available to download ${artifact_id}" >&2
    exit 1
  fi

  verify_checksums "${artifact_path}" "${expected_sha1}" "${expected_sha256}" "${artifact_id}"

  echo "--- Extract ${side} distributable to ${extract_dir}"
  tar -xf "${artifact_path}" -I zstd -C "${extract_dir}" --strip=1
  rm -f "${artifact_path}"
}

write_manifest() {
  local generated_at
  generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  mkdir -p "${WORK_DIR}"
  cat >"${MANIFEST_PATH}" <<EOF
{
  "version": 1,
  "orientation": "${ORIENTATION}",
  "seed": "${SEED}",
  "generatedAt": "${generated_at}",
  "pipelineSlug": "${PIPELINE_SLUG}",
  "left": {
    "buildId": "${LEFT_BUILD_ID}",
    "buildNumber": ${LEFT_BUILD_NUMBER},
    "commitSha": "${LEFT_COMMIT}",
    "artifactId": "${LEFT_ARTIFACT_ID}",
    "artifactPath": "${ARTIFACT_FILENAME}",
    "buildUrl": "${LEFT_BUILD_URL}",
    "sha1": "${LEFT_SHA1}",
    "sha256": "${LEFT_SHA256}"
  },
  "right": {
    "buildId": "${RIGHT_BUILD_ID}",
    "buildNumber": ${RIGHT_BUILD_NUMBER},
    "commitSha": "${RIGHT_COMMIT}",
    "artifactId": "${RIGHT_ARTIFACT_ID}",
    "artifactPath": "${ARTIFACT_FILENAME}",
    "buildUrl": "${RIGHT_BUILD_URL}",
    "sha1": "${RIGHT_SHA1}",
    "sha256": "${RIGHT_SHA256}"
  },
  "extractDirs": {
    "left": "${LEFT_BUILD_DIR}",
    "right": "${RIGHT_BUILD_DIR}"
  },
  "reportPath": "${REPORT_PATH}"
}
EOF
}

export_report_context() {
  export KIBANA_CI_WARM_START_MEMORY_CALIBRATION_ORIENTATION="${ORIENTATION}"
  export KIBANA_CI_WARM_START_MEMORY_SEED="${SEED}"
  export KIBANA_CI_WARM_START_MEMORY_BASELINE_COMMIT="${LEFT_COMMIT}"
  export KIBANA_CI_WARM_START_MEMORY_TARGET_COMMIT="${RIGHT_COMMIT}"
  export KIBANA_CI_WARM_START_MEMORY_BASELINE_BUILD_ID="${LEFT_BUILD_ID}"
  export KIBANA_CI_WARM_START_MEMORY_TARGET_BUILD_ID="${RIGHT_BUILD_ID}"
  export KIBANA_CI_WARM_START_MEMORY_REPORT_PATH="${REPORT_PATH}"
}

run_benchmark() {
  echo "--- Warm-start calibration orientation=${ORIENTATION} seed=${SEED}"
  echo "left=${LEFT_BUILD_DIR} (${LEFT_COMMIT})"
  echo "right=${RIGHT_BUILD_DIR} (${RIGHT_COMMIT})"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] would run node scripts/bench.js with ${BENCH_CONFIG_PATH}"
    return 0
  fi

  rm -f "${REPORT_PATH}"
  node scripts/bench.js \
    --config "${BENCH_CONFIG_PATH}" \
    --config-from-cwd \
    --left-build-dir "${LEFT_BUILD_DIR}" \
    --right-build-dir "${RIGHT_BUILD_DIR}"
}

upload_calibration_artifacts() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] would upload ${WORK_DIR} artifacts"
    return 0
  fi

  if ! command -v buildkite-agent >/dev/null 2>&1; then
    echo "buildkite-agent unavailable; skipping artifact upload"
    return 0
  fi

  echo "--- Upload warm-start calibration manifest and report"
  buildkite-agent artifact upload "${MANIFEST_PATH}"
  if [[ -f "${REPORT_PATH}" ]]; then
    buildkite-agent artifact upload "${REPORT_PATH}"
  fi
}

cd "${REPO_ROOT}"

if [[ -f .buildkite/scripts/common/util.sh ]]; then
  # shellcheck source=/dev/null
  source .buildkite/scripts/common/util.sh
fi

ORIENTATION="$(printf '%s' "${ORIENTATION}" | tr '[:upper:]' '[:lower:]')"
resolve_orientation "${ORIENTATION}"

LEFT_STAGE_DIR="${WORK_DIR}/.staging/left"
RIGHT_STAGE_DIR="${WORK_DIR}/.staging/right"
LEFT_ARTIFACT_PATH="${LEFT_STAGE_DIR}/${LEFT_ARTIFACT_ID}-${ARTIFACT_FILENAME}"
RIGHT_ARTIFACT_PATH="${RIGHT_STAGE_DIR}/${RIGHT_ARTIFACT_ID}-${ARTIFACT_FILENAME}"

write_manifest
export_report_context

download_side_artifact \
  left \
  "${LEFT_BUILD_ID}" \
  "${LEFT_ARTIFACT_ID}" \
  "${LEFT_SHA1}" \
  "${LEFT_SHA256}" \
  "${LEFT_STAGE_DIR}" \
  "${LEFT_ARTIFACT_PATH}" \
  "${LEFT_BUILD_DIR}"

download_side_artifact \
  right \
  "${RIGHT_BUILD_ID}" \
  "${RIGHT_ARTIFACT_ID}" \
  "${RIGHT_SHA1}" \
  "${RIGHT_SHA256}" \
  "${RIGHT_STAGE_DIR}" \
  "${RIGHT_ARTIFACT_PATH}" \
  "${RIGHT_BUILD_DIR}"

run_benchmark
upload_calibration_artifacts

echo "Warm-start calibration complete"
echo "manifest=${MANIFEST_PATH}"
echo "report=${REPORT_PATH}"
