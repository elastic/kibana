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

# ES_BUILD_JAVA = openjdk14 -- .ci/java-versions.properties
export ES_BUILD_JAVA="openjdk14"
export PATH="$HOME/.java/$ES_BUILD_JAVA/bin:$PATH"

./gradlew -Dbuild.docker=true assemble --parallel
# mkdir -p ${destination}
find distribution -type f \( -name 'elasticsearch-*-*-*-*.tar.gz' -o -name 'elasticsearch-*-*-*-*.zip' \) -not -path '*no-jdk*' -not -path '*build-context*' -exec cp {} "$destination" \;
ls -alh "$destination"
docker images "docker.elastic.co/elasticsearch/elasticsearch"
docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 echo 'docker save docker.elastic.co/elasticsearch/elasticsearch:${0} | gzip > ../es-build/elasticsearch-${0}-docker-image.tar.gz'
docker images "docker.elastic.co/elasticsearch/elasticsearch" --format "{{.Tag}}" | xargs -n1 bash -c 'docker save docker.elastic.co/elasticsearch/elasticsearch:${0} | gzip > ../es-build/elasticsearch-${0}-docker-image.tar.gz'
sh 'find * -exec bash -c "shasum -a 512 {} > {}.sha512" \\;'
ls -alh "$destination"

cd "$destination"

