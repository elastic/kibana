#!/bin/bash
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co

KIBANA_BASE_IMAGE="docker.elastic.co/kibana-ci/kibana-serverless"
KIBANA_CURRENT_COMMIT=${KIBANA_BASE_IMAGE}:sec-sol-qg-${BUILDKITE_COMMIT:0:12}
KIBANA_LATEST=${KIBANA_BASE_IMAGE}:latest

if [ "$KIBANA_MKI_USE_LATEST_COMMIT" = "1" ]; then
    KBN_IMAGE=${KIBANA_CURRENT_COMMIT}
else
    KBN_IMAGE=${KIBANA_LATEST}
fi

docker pull ${KBN_IMAGE}
build_date=$(docker inspect ${KBN_IMAGE} | jq -r '.[0].Config.Labels."org.label-schema.build-date"')
vcs_ref=$(docker inspect ${KBN_IMAGE} | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
vcs_url=$(docker inspect ${KBN_IMAGE} | jq -r '.[0].Config.Labels."org.label-schema.vcs-url"')
version=$(docker inspect ${KBN_IMAGE} | jq -r '.[0].Config.Labels."org.label-schema.version"')   

markdown_text="""
    # Kibana Container Metadata
    - Build Date            : $build_date 
    - Github Commit Hash    : $vcs_ref 
    - Github Repo           : $vcs_url 
    - Version               : $version
"""
echo "${markdown_text//[*\\_]/\\&}" | buildkite-agent annotate --style "info"