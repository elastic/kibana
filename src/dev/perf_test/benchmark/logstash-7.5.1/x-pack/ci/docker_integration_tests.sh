#!/bin/bash

# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

if [ -n "${ELASTICSEARCH_SNAPSHOT_URL}" ]; then
  export DOCKER_ENV_OPTS="${DOCKER_ENV_OPTS} --env ELASTICSEARCH_SNAPSHOT_URL=${ELASTICSEARCH_SNAPSHOT_URL}"
fi

ci/docker_run.sh logstash-xpack-integration-tests x-pack/ci/integration_tests.sh $@
