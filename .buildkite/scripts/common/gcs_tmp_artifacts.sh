#!/usr/bin/env bash

# Helpers for exchanging temporary build artifacts between steps via the regional kibana-ci-artifacts GCS buckets.

GCS_CI_ARTIFACT_REGIONS=("asia-south2" "europe-west2" "northamerica-northeast2" "southamerica-east1" "us-central1" "us-east1" "us-west1")

download_tmp_artifact() {
  local artifact_name="$1" dest_dir="$2" build_id="$3" fallback="${4:-true}"
  local region use_gcs=false

  for region in "${GCS_CI_ARTIFACT_REGIONS[@]}"; do
    if [[ "${BUILDKITE_AGENT_GCP_REGION:-}" == "$region" ]]; then
      use_gcs=true
      break
    fi
  done

  if [[ "$use_gcs" == "true" ]]; then
    local expected_sha256
    expected_sha256="$(tmp_artifact_expected_sha256 "$artifact_name" "$build_id")"

    if [[ -z "$expected_sha256" ]]; then
      echo "No recorded checksum for ${artifact_name} (build ${build_id}), skipping GCS download."
    elif "${SCRIPTS_COMMON_DIR}/activate_service_account.sh" "kibana-ci-artifacts-${BUILDKITE_AGENT_GCP_REGION}" \
      && gcloud storage cp \
        "$(tmp_artifact_object "$BUILDKITE_AGENT_GCP_REGION" "$build_id" "$expected_sha256" "$artifact_name")" \
        "${dest_dir}/${artifact_name}"; then
      if [[ "$(sha256_of "${dest_dir}/${artifact_name}")" == "$expected_sha256" ]]; then
        return 0
      fi
      echo "Checksum mismatch for ${artifact_name} from kibana-ci-artifacts-${BUILDKITE_AGENT_GCP_REGION} (build ${build_id}), discarding it." >&2
      rm -f "${dest_dir}/${artifact_name}"
    else
      echo "GCS download failed for ${artifact_name} from kibana-ci-artifacts-${BUILDKITE_AGENT_GCP_REGION} (build ${build_id})."
    fi
  fi

  if [[ "$fallback" != "true" ]]; then
    return 1
  fi

  echo "Falling back to Buildkite artifact download for ${artifact_name} (build ${build_id})."
  download_artifact "$artifact_name" "$dest_dir" --build "$build_id"
}

upload_tmp_artifact() {
  local local_path="$1" artifact_name="$2" build_id="$3"
  local region pids=() failures=0 sha256

  # Downloads only trust GCS objects matching the checksum recorded in the producing build's meta-data
  if ! sha256="$(sha256_of "$local_path")" || ! buildkite-agent meta-data set "tmp-artifact-sha256:${artifact_name}" "$sha256"; then
    echo "Failed to record checksum for ${artifact_name}; skipping GCS upload. Same-region downloads will fall back to the buildkite artifact." >&2
    return 0
  fi

  if ! "${SCRIPTS_COMMON_DIR}/activate_service_account.sh" "kibana-ci-artifacts-${GCS_CI_ARTIFACT_REGIONS[0]}"; then
    echo "Service account activation failed; skipping GCS upload of ${artifact_name}. Same-region downloads will fall back to the buildkite artifact." >&2
    return 0
  fi

  for region in "${GCS_CI_ARTIFACT_REGIONS[@]}"; do
    upload_tmp_artifact_to_region "$local_path" "$(tmp_artifact_object "$region" "$build_id" "$sha256" "$artifact_name")" &
    pids+=("$!")
  done

  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      failures=$((failures + 1))
    fi
  done

  if [[ "$failures" -gt 0 ]]; then
    echo "GCS upload of ${artifact_name} failed for ${failures}/${#GCS_CI_ARTIFACT_REGIONS[@]} bucket(s); same-region downloads will fall back to the buildkite artifact." >&2
  fi

  return 0
}

upload_tmp_artifact_to_region() (
  local local_path="$1" object="$2"
  local config_dir

  config_dir="$(mktemp -d -t gcloud-upload-XXXXXX)"
  trap 'rm -rf "$config_dir"' EXIT
  cp -a "${CLOUDSDK_CONFIG:-$HOME/.config/gcloud}/." "$config_dir/"
  export CLOUDSDK_CONFIG="$config_dir"

  retry 3 5 upload_tmp_artifact_object_if_missing "$local_path" "$object"
)

# Uploads never replace an existing object; the object path already pins the content's checksum
upload_tmp_artifact_object_if_missing() {
  local local_path="$1" object="$2"

  if gcloud storage objects describe "$object" > /dev/null 2>&1; then
    echo "${object} already exists, skipping upload."
  else
    gcloud storage cp --if-generation-match=0 "$local_path" "$object"
  fi
}

# Objects are addressed by content checksum, so a re-upload with different content never has to overwrite
tmp_artifact_object() {
  local region="$1" build_id="$2" sha256="$3" artifact_name="$4"

  echo "gs://kibana-ci-artifacts-${region}/tmp/builds/${build_id}/${sha256}/${artifact_name}"
}

# Artifacts of other builds are checked against the checksum Buildkite recorded for their buildkite artifact
tmp_artifact_expected_sha256() {
  local artifact_name="$1" build_id="$2" sha256

  if [[ "$build_id" == "${BUILDKITE_BUILD_ID:-}" ]]; then
    sha256="$(buildkite-agent meta-data get "tmp-artifact-sha256:${artifact_name}" --default '' 2>/dev/null || true)"
  else
    sha256="$(buildkite-agent artifact shasum --sha256 --build "$build_id" "$artifact_name" 2>/dev/null || true)"
  fi

  if [[ "$sha256" =~ ^[0-9a-f]{64}$ ]]; then
    echo "$sha256"
  fi
}

sha256_of() {
  local file_sha256
  file_sha256="$(sha256sum "$1")" || return 1
  echo "${file_sha256%% *}"
}
