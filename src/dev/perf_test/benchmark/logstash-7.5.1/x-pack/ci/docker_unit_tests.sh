#!/bin/bash

# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

ci/docker_run.sh logstash-xpack-unit-tests x-pack/ci/unit_tests.sh $@
