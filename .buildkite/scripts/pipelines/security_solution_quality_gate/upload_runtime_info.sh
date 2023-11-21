if [ -z "${KIBANA_LATEST+x}" ]; then
    KIBANA_OVERRIDE_FLAG=0
else
    KIBANA_OVERRIDE_FLAG=$KIBANA_LATEST
fi

echo "KIBANA override is: $KIBANA_OVERRIDE_FLAG"

if [ "$KIBANA_OVERRIDE_FLAG" = "1" ]; then
    echo "KIBANA_OVERRIDE_FLAG is equal to 1"
    echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
    docker pull docker.elastic.co/kibana-ci/kibana-serverless:latest
    build_date=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.build-date"')
    vcs_ref=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
    vcs_url=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-url"')
    version=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.version"')
    markdown_text="""
        # Kibana Container Metadata
        - Build Date            : $build_date 
        - Github Commit Hash    : $vcs_ref 
        - Github Repo           : $vcs_url 
        - Version               : $version
    """
    echo "${markdown_text//[*\\_]/\\&}" | buildkite-agent annotate --style "info"
fi
