#!/bin/bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo "--- Cloning Elasticsearch and preparing workspace"

cd ..
destination="$(pwd)/es-build"
rm -rf "$destination"
mkdir -p "$destination"

mkdir -p elasticsearch && cd elasticsearch

export ELASTICSEARCH_BRANCH="${ELASTICSEARCH_BRANCH:-$BUILDKITE_BRANCH}"

if [[ ! -d .git ]]; then
  git init
  git remote add origin https://github.com/elastic/elasticsearch.git
fi
git fetch origin --depth 1 "$ELASTICSEARCH_BRANCH"
git reset --hard FETCH_HEAD

ELASTICSEARCH_GIT_COMMIT="$(git rev-parse HEAD)"
export ELASTICSEARCH_GIT_COMMIT

ELASTICSEARCH_GIT_COMMIT_SHORT="$(git rev-parse --short HEAD)"
export ELASTICSEARCH_GIT_COMMIT_SHORT

# These turn off automation in the Elasticsearch repo
export BUILD_NUMBER=""
export JENKINS_URL=""
export BUILD_URL=""
export JOB_NAME=""
export NODE_NAME=""

# Reads the ES_BUILD_JAVA env var out of .ci/java-versions.properties and exports it
export "$(grep '^ES_BUILD_JAVA' .ci/java-versions.properties | xargs)"

export PATH="$HOME/.java/$ES_BUILD_JAVA/bin:$PATH"
export JAVA_HOME="$HOME/.java/$ES_BUILD_JAVA"
export DOCKER_BUILDKIT=1

# The Elasticsearch Dockerfile needs to be built with root privileges, but Docker on our servers is running using a non-root user
# So, let's use docker-in-docker to temporarily create a privileged docker daemon to run `docker build` on
# We have to do this, because there's no `docker build --privileged` or similar

echo "--- Setting up Docker-in-Docker for Elasticsearch"

docker rm -f dind || true # If there's an old daemon running that somehow didn't get cleaned up, lets remove it first
CERTS_DIR="$HOME/dind-certs"
rm -rf "$CERTS_DIR"
docker run -d --rm --privileged --name dind --userns host -p 2377:2376 -e DOCKER_TLS_CERTDIR=/certs -v "$CERTS_DIR":/certs docker:dind

trap "docker rm -f dind" EXIT

export DOCKER_TLS_VERIFY=true
export DOCKER_CERT_PATH="$CERTS_DIR/client"
export DOCKER_TLS_CERTDIR="$CERTS_DIR"
export DOCKER_HOST=localhost:2377

echo "--- Build Elasticsearch"
./gradlew \
  :distribution:archives:darwin-aarch64-tar:assemble \
  :distribution:archives:darwin-tar:assemble \
  :distribution:docker:docker-export:assemble \
  :distribution:archives:linux-aarch64-tar:assemble \
  :distribution:archives:linux-tar:assemble \
  :distribution:archives:windows-zip:assemble \
  --parallel

echo "--- Create distribution archives"
find distribution -type f \( -name 'elasticsearch-*-*-*-*.tar.gz' -o -name 'elasticsearch-*-*-*-*.zip' \) -not -path '*no-jdk*' -not -path '*build-context*' -exec cp {} "$destination" \;

ls -alh "$destination"

echo "--- Create docker default image archives"
docker images "docker.elastic.co/elasticsearch/elasticsearch"
docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 echo 'docker save docker.elastic.co/elasticsearch/elasticsearch:${0} | gzip > ../es-build/elasticsearch-${0}-docker-image.tar.gz'
docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 bash -c 'docker save docker.elastic.co/elasticsearch/elasticsearch:${0} | gzip > ../es-build/elasticsearch-${0}-docker-image.tar.gz'

echo "--- Create kibana-ci docker cloud image archives"
# Ignore build failures.  This docker image downloads metricbeat and filebeat.
# When we bump versions, these dependencies may not exist yet, but we don't want to
# block the rest of the snapshot promotion process
set +e
./gradlew :distribution:docker:cloud-docker-export:assemble && {
  ES_CLOUD_ID=$(docker images "docker.elastic.co/elasticsearch-ci/elasticsearch-cloud" --format "{{.ID}}")
  ES_CLOUD_VERSION=$(docker images "docker.elastic.co/elasticsearch-ci/elasticsearch-cloud" --format "{{.Tag}}")
  KIBANA_ES_CLOUD_VERSION="$ES_CLOUD_VERSION-$ELASTICSEARCH_GIT_COMMIT"
  KIBANA_ES_CLOUD_IMAGE="docker.elastic.co/kibana-ci/elasticsearch-cloud:$KIBANA_ES_CLOUD_VERSION"
  echo $ES_CLOUD_ID $ES_CLOUD_VERSION $KIBANA_ES_CLOUD_VERSION $KIBANA_ES_CLOUD_IMAGE
  docker tag "$ES_CLOUD_ID" "$KIBANA_ES_CLOUD_IMAGE"

  echo "$KIBANA_DOCKER_PASSWORD" | docker login -u "$KIBANA_DOCKER_USERNAME" --password-stdin docker.elastic.co
  trap 'docker logout docker.elastic.co' EXIT
  docker image push "$KIBANA_ES_CLOUD_IMAGE"

  export ELASTICSEARCH_CLOUD_IMAGE="$KIBANA_ES_CLOUD_IMAGE"
  export ELASTICSEARCH_CLOUD_IMAGE_CHECKSUM="$(docker images "$KIBANA_ES_CLOUD_IMAGE" --format "{{.Digest}}")"
}
set -e

echo "--- Create checksums for snapshot files"
cd "$destination"
find ./* -exec bash -c "shasum -a 512 {} > {}.sha512" \;

cd "$BUILDKITE_BUILD_CHECKOUT_PATH"
ts-node "$(dirname "${0}")/create_manifest.ts" "$destination"

ES_SNAPSHOT_MANIFEST="$(buildkite-agent meta-data get ES_SNAPSHOT_MANIFEST)"

cat << EOF | buildkite-agent annotate --style "info"
  - \`ELASTICSEARCH_BRANCH\` - \`$ELASTICSEARCH_BRANCH\`
  - \`ELASTICSEARCH_GIT_COMMIT\` - \`$ELASTICSEARCH_GIT_COMMIT\`
  - \`ES_SNAPSHOT_MANIFEST\` - \`$ES_SNAPSHOT_MANIFEST\`
  - \`ES_SNAPSHOT_VERSION\` - \`$(buildkite-agent meta-data get ES_SNAPSHOT_VERSION)\`
  - \`ES_SNAPSHOT_ID\` - \`$(buildkite-agent meta-data get ES_SNAPSHOT_ID)\`
EOF

cat << EOF | buildkite-agent pipeline upload
steps:
  - trigger: 'kibana-elasticsearch-snapshot-verify'
    async: true
    build:
      env:
        ES_SNAPSHOT_MANIFEST: '$ES_SNAPSHOT_MANIFEST'
      branch: '$BUILDKITE_BRANCH'
EOF
