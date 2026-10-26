#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/config.sh"
source "$(dirname "${0}")/../../common/util.sh"

ES_SNAPSHOTS_DAILY_BASE_URL="https://storage.googleapis.com/kibana-ci-es-snapshots-daily"
ALLOWED_DOCKER_EXPORT_URL_PREFIX="$ES_SNAPSHOTS_DAILY_BASE_URL/$DEPLOYMENT_VERSION/archives/"

"$(dirname "${0}")/auth.sh"

echo '--- Import and publish Elasticsearch image'

mkdir -p target

export ES_IMAGE="gcr.io/elastic-kibana-184716/demo/elasticsearch:$DEPLOYMENT_NAME-$(git rev-parse HEAD)"

DOCKER_EXPORT_URL=$(curl -fsS "$ES_SNAPSHOTS_DAILY_BASE_URL/$DEPLOYMENT_VERSION/manifest-latest-verified.json" | jq -r '.archives | .[] | select(.url | test("docker-image")) | .url')
if [[ "$DOCKER_EXPORT_URL" != "$ALLOWED_DOCKER_EXPORT_URL_PREFIX"* || "$DOCKER_EXPORT_URL" == *..* ]]; then
  echo "Unexpected ES docker export url: $DOCKER_EXPORT_URL"
  exit 1
fi
curl -fsS "$DOCKER_EXPORT_URL" > target/elasticsearch-docker.tar.gz
EXPECTED_CHECKSUM=$(curl -fsS "$DOCKER_EXPORT_URL.sha512" | cut -d' ' -f1)
ACTUAL_CHECKSUM=$(shasum -a 512 target/elasticsearch-docker.tar.gz | cut -d' ' -f1)
if [[ "$ACTUAL_CHECKSUM" != "$EXPECTED_CHECKSUM" ]]; then
  echo "Checksum mismatch for $DOCKER_EXPORT_URL"
  exit 1
fi
docker load < target/elasticsearch-docker.tar.gz
docker tag "docker.elastic.co/elasticsearch/elasticsearch:$DEPLOYMENT_VERSION-SNAPSHOT" "$ES_IMAGE"
docker_with_retry push "$ES_IMAGE"

echo '--- Prepare yaml'

TEMPLATE=$(envsubst < "$(dirname "${0}")/es_and_init.yml")

echo "$TEMPLATE"

cat << EOF | buildkite-agent annotate --style "info" --context demo-env-info
The demo environment can be accessed here, once Kibana and ES are running:

https://demo.kibana.dev/$DEPLOYMENT_MINOR_VERSION

Logs, etc can be found here:

https://console.cloud.google.com/kubernetes/workload?project=elastic-kibana-184716&pageState=(%22savedViews%22:(%22n%22:%5B%22${DEPLOYMENT_NAME}%22%5D,%22c%22:%5B%22gke%2Fus-central1%2Fdemo-env%22%5D))

EOF

echo '--- Deploy yaml'
echo "$TEMPLATE" | kubectl apply -f -
