#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/config.sh"

"$(dirname "${0}")/auth.sh"

echo '--- Import and publish Elasticsearch image'

mkdir -p target

export ES_IMAGE="gcr.io/elastic-kibana-184716/demo/elasticsearch:$DEPLOYMENT_NAME-$(git rev-parse HEAD)"

DOCKER_EXPORT_URL=$(curl https://storage.googleapis.com/kibana-ci-es-snapshots-daily/$DEPLOYMENT_VERSION/manifest-latest-verified.json | jq -r '.archives | .[] | select(.url | test("docker-image")) | .url')
curl "$DOCKER_EXPORT_URL" > target/elasticsearch-docker.tar.gz
docker load < target/elasticsearch-docker.tar.gz
docker tag "docker.elastic.co/elasticsearch/elasticsearch:$DEPLOYMENT_VERSION-SNAPSHOT" "$ES_IMAGE"
docker push "$ES_IMAGE"

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
