#!/usr/bin/env bash

# docker.elastic.co access is decided once per job by pipeline slug (docker_registry_tier):
#   publish  kibana-ci-publish  pull, push to trusted kibana-ci/*  kv/ci-shared/kibana/publish/container-registry
#   pr       kibana-ci-pr       pull, push to kibana-ci/*-pr only  kv/ci-shared/kibana/pr/container-registry
#   read     kibana-ci-read     pull only                          secret/ci/elastic-kibana/kibana-container-registry-ci-read
# Image steps only tag and push; they never log in themselves.

# Called from setup_job_env.sh before the job's command, while the job's Vault token is still valid
docker_login_for_pipeline() {
  case "$(docker_registry_tier)" in
    publish)
      docker_login_kibana_ci_publish
      ;;
    pr)
      docker_login_kibana_ci_pr
      ;;
    *)
      docker_login_kibana_ci_read
      ;;
  esac
}

# Repository this pipeline may push <name> to: trusted on publish pipelines, its -pr counterpart elsewhere
kibana_ci_image_repository() {
  local name="$1"
  if [[ "$(docker_registry_tier)" == "publish" ]]; then
    echo "docker.elastic.co/kibana-ci/$name"
  else
    echo "docker.elastic.co/kibana-ci/$name-pr"
  fi
}

# node scripts/build always names images kibana-ci/<name>; this retags one for the pipeline's push repository and pushes it
retag_and_push_image() {
  local build_output_image="$1"
  local target_image="$2"
  docker tag "$build_output_image" "$target_image"
  docker_with_retry push "$target_image"
}

# Slug lists must match the Buildkite pipeline grants on the Vault paths above, in elastic/terrazzo
docker_registry_tier() {
  case "${BUILDKITE_PIPELINE_SLUG:-}" in
    kibana-artifacts-container-image | \
    kibana-artifacts-snapshot | \
    kibana-artifacts-staging | \
    kibana-elasticsearch-serverless-promote | \
    kibana-elasticsearch-snapshot-build | \
    kibana-elasticsearch-snapshot-promote | \
    kibana-package-registry-verify-and-promote | \
    kibana-uiam-cosmos-db-emulator-verify-and-promote | \
    kibana-uiam-verify-and-promote)
      echo publish
      ;;
    kibana-pull-request | \
    kibana-deploy-project-from-pr | \
    kibana-deploy-cloud-from-pr | \
    kibana-entity-store-performance-from-pr)
      echo pr
      ;;
    *)
      echo read
      ;;
  esac
}

docker_login_kibana_ci_publish() {
  is_docker_available || return 0
  local username password
  username="$(retry 5 5 vault kv get -field=username kv/ci-shared/kibana/publish/container-registry)"
  password="$(retry 5 5 vault kv get -field=password kv/ci-shared/kibana/publish/container-registry)"
  echo "$password" | docker login -u "$username" --password-stdin docker.elastic.co
}

docker_login_kibana_ci_pr() {
  is_docker_available || return 0
  local username password
  username="$(retry 5 5 vault kv get -field=username kv/ci-shared/kibana/pr/container-registry)"
  password="$(retry 5 5 vault kv get -field=password kv/ci-shared/kibana/pr/container-registry)"
  echo "$password" | docker login -u "$username" --password-stdin docker.elastic.co
}

docker_login_kibana_ci_read() {
  is_docker_available || return 0
  local username password
  username="$(retry 5 5 vault read -field=username secret/ci/elastic-kibana/kibana-container-registry-ci-read)"
  password="$(retry 5 5 vault read -field=password secret/ci/elastic-kibana/kibana-container-registry-ci-read)"
  echo "$password" | docker login -u "$username" --password-stdin docker.elastic.co
}

is_docker_available() {
  (command -v docker && docker version) &> /dev/null
}
