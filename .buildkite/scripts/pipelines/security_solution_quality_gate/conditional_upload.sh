if [ -z "${KIBANA_LATEST+x}" ]; then
    KIBANA_OVERRIDE_FLAG=0
else
    KIBANA_OVERRIDE_FLAG=$KIBANA_LATEST
fi

if [ "$KIBANA_OVERRIDE_FLAG" = "1" ]; then
    echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
    docker pull docker.elastic.co/kibana-ci/kibana-serverless:latest
    vcs_ref=$(docker inspect docker.elastic.co/kibana-ci/kibana-serverless:latest | jq -r '.[0].Config.Labels."org.label-schema.vcs-ref"')
    buildkite-agent pipeline upload <<YAML
        steps:
        - label: Checking build commit
        command: "echo '$BUILDKITE_COMMIT'"
        key: random_step
        agents:
            queue: n2-4-spot
        timeout_in_minutes: 120
        build:
            env:
            BUILDKITE_COMMIT: $vcs_ref
        retry:
            automatic:
            - exit_status: "*"
                limit: 2
YAML
fi
