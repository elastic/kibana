#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
source .buildkite/scripts/steps/artifacts/env.sh

.buildkite/scripts/bootstrap.sh

echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
trap 'docker logout docker.elastic.co' EXIT

# temporary adding this to get screenshots
# is_test_execution_step

echo "--- Smoke Testing for FIPS"

mkdir -p target
cd target

# download_artifact "kibana-ubi-fips-$FULL_VERSION-docker-image.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
# KIBANA_IP_ADDRESS="192.168.56.7"

# docker load <"kibana-ubi-fips-$FULL_VERSION-docker-image.tar.gz"

cd ..

node scripts/es snapshot \
  -E network.bind_host=0.0.0.0 \
  -E discovery.type=single-node \
  --license=trial &
while ! timeout 1 bash -c "echo > /dev/tcp/localhost/9200"; do sleep 30; done

# function echoKibanaLogs {
#   if [[ "$TEST_PACKAGE" == "deb" ]] || [[ "$TEST_PACKAGE" == "rpm" ]]; then
#     echo "--- /var/log/kibana/kibana.log "
#     vagrant ssh $TEST_PACKAGE -t -c 'sudo cat /var/log/kibana/kibana.log'

#     echo "--- Journal "
#     vagrant ssh $TEST_PACKAGE -t -c 'sudo journalctl -u kibana.service --no-pager'
#   elif [[ "$TEST_PACKAGE" == "docker" ]]; then
#     echo '--- Docker logs'
#     vagrant ssh $TEST_PACKAGE -t -c 'sudo docker logs kibana'
#   fi
# }
# trap "echoKibanaLogs" EXIT

# export SERVER_HOST="0.0.0.0"
# export ELASTICSEARCH_HOSTS="http://127.0.0.1:9200"
# export ELASTICSEARCH_USERNAME="kibana_system"
# export ELASTICSEARCH_PASSWORD="changeme"

# docker run -p 5601:5601 --rm docker.elastic.co/kibana-ci/kibana-ubi-fips:$FULL_VERSION-$BUILDKITE_COMMIT
docker run \
  -p 5601:5601 \
  --env SERVER_HOST="0.0.0.0" \
  --env ELASTICSEARCH_HOSTS="http://host.docker.internal:9200" \
  --env ELASTICSEARCH_USERNAME="kibana_system" \
  --env ELASTICSEARCH_PASSWORD="changeme" \
  docker.elastic.co/kibana/kibana-ubuntu:sha256-cc026fad557bbde3376c6bff7148e57db504cc3e0a233c72db32169d52b1a75e
