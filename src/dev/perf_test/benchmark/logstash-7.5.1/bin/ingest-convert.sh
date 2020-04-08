#!/usr/bin/env bash

java -cp "$(cd `dirname $0`/..; pwd)"'/tools/ingest-converter/build/libs/ingest-converter.jar:*' \
 org.logstash.ingest.Pipeline "$@"
