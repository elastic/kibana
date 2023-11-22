#!/bin/bash
echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co

if [ "$KIBANA_LATEST" = "1" ]; then
    docker pull docker.elastic.co/kibana-ci/kibana-serverless:git-${BUILDKITE_COMMIT:0:12}
    build_date=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:git-${BUILDKITE_COMMIT:0:12} | jq -r '.[0].Config.Labels."org.label-schema.build-date"')
    vcs_ref=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:git-${BUILDKITE_COMMIT:0:12} | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
    vcs_url=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:git-${BUILDKITE_COMMIT:0:12} | jq -r '.[0].Config.Labels."org.label-schema.vcs-url"')
    version=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:git-${BUILDKITE_COMMIT:0:12} | jq -r '.[0].Config.Labels."org.label-schema.version"')
   
else
    docker pull docker.elastic.co/kibana-ci/kibana-serverless:latest
    build_date=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.build-date"')
    vcs_ref=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
    vcs_url=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-url"')
    version=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.version"')
fi

markdown_text="""
    # Kibana Container Metadata
    - Build Date            : $build_date 
    - Github Commit Hash    : $vcs_ref 
    - Github Repo           : $vcs_url 
    - Version               : $version
"""
echo "${markdown_text//[*\\_]/\\&}" | buildkite-agent annotate --style "info"