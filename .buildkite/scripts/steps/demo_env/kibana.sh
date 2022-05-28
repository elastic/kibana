#!/usr/bin/env bash

set -euo pipefail

.buildkite/scripts/bootstrap.sh

source "$(dirname "${0}")/config.sh"

export KIBANA_IMAGE="gcr.io/elastic-kibana-184716/demo/kibana:$DEPLOYMENT_NAME-$(git rev-parse HEAD)"

echo '--- Build Kibana'
node scripts/build --debug --docker-images --example-plugins --skip-docker-ubi --skip-docker-cloud --skip-docker-contexts

echo '--- Build Docker image with example plugins'
cd target/example_plugins
BUILT_IMAGE="docker.elastic.co/kibana/kibana:$DEPLOYMENT_VERSION-SNAPSHOT"
docker build --build-arg BASE_IMAGE="$BUILT_IMAGE" -t "$KIBANA_IMAGE" -f "$KIBANA_DIR/.buildkite/scripts/steps/demo_env/Dockerfile" .
docker push "$KIBANA_IMAGE"
cd -

"$(dirname "${0}")/auth.sh"

echo '--- Prepare yaml'

TEMPLATE=$(envsubst < "$(dirname "${0}")/kibana.yml")

echo "$TEMPLATE"

echo '--- Deploy yaml'
echo "$TEMPLATE" | kubectl apply -f -
