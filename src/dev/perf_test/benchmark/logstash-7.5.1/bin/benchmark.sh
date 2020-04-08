#!/usr/bin/env bash

java -cp "$(cd `dirname $0`/..; pwd)"'/tools/benchmark-cli/build/libs/benchmark-cli.jar:*' \
 org.logstash.benchmark.cli.Main "$@"
