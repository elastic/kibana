#!/bin/bash

set -euo pipefail

source "$(dirname "${0}")/../util.sh"

cd ..
destination="$(pwd)/es-build"
mkdir -p "$destination"

cd elasticsearch

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

tc_start_block "Build Elasticsearch"
./gradlew -Dbuild.docker=true assemble --parallel
tc_end_block "Build Elasticsearch"

tc_start_block "Create distribution archives"
find distribution -type f \( -name 'elasticsearch-*-*-*-*.tar.gz' -o -name 'elasticsearch-*-*-*-*.zip' \) -not -path '*no-jdk*' -not -path '*build-context*' -exec cp {} "$destination" \;
tc_end_block "Create distribution archives"

ls -alh "$destination"

tc_start_block "Create docker image archives"
docker images "docker.elastic.co/elasticsearch/elasticsearch"
docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 echo 'docker save docker.elastic.co/elasticsearch/elasticsearch:${0} | gzip > ../es-build/elasticsearch-${0}-docker-image.tar.gz'
docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 bash -c 'docker save docker.elastic.co/elasticsearch/elasticsearch:${0} | gzip > ../es-build/elasticsearch-${0}-docker-image.tar.gz'
tc_end_block "Create docker image archives"

cd "$destination"

find ./* -exec bash -c "shasum -a 512 {} > {}.sha512" \;
ls -alh "$destination"
