# Licensed to Elasticsearch B.V. under one or more contributor
# license agreements. See the NOTICE file distributed with
# this work for additional information regarding copyright
# ownership. Elasticsearch B.V. licenses this file to you under
# the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

#!/bin/bash

#
# Script to run multiple kibana instances in parallel.
# Make sure to run the script from kibana root directory.
#
# NOTE: This is not run during CI but helps with manual testing
#
# bash parallel.sh <function> [options]
# functions:
#   start [instances] - start multiple kibanas (3 default)
#   es - run elasticsearch with 7.7.2 snapshot data
#   tail - show logs of all kibanas
#   kill - kills all started kibana processes
#   clean - clean up nohup files
#   kibana_index - search .kibana index against es
#

FN="$1"
NUM="$2"

if [ "${FN}" == "kill" ]; then
  echo "killing main processes"
  for pid in $(cat processes.out); do kill -9 $pid; done
  echo "killing trailing processes"
  for pid in $(pgrep -f scripts/kibana); do kill -9 $pid; done
  exit 0;
fi

if [ "${FN}" == "tail" ]; then
  tail -f nohup_*
  exit 0;
fi

if [ "${FN}" == "clean" ]; then
  rm -r nohup_*.out
  rm processes.out
  exit 0;
fi

if [ "${FN}" == "es" ]; then
  yarn es snapshot --data-archive=src/core/server/saved_objects/migrationsv2/integration_tests/archives/7.7.2_xpack_100k_obj.zip
  exit 0;
fi

if [ "${FN}" == "kibana_index" ]; then
  # search the kibana index
  curl -XPOST http://elastic:changeme@localhost:9200/.kibana/_search -u elastic:changeme -d '' | jq
  exit 0;
fi

if [ "${FN}" == "start" ]; then
  if test ! "${NUM-}"; then
    NUM=3
  fi
  node scripts/build_kibana_platform_plugins --no-examples
  rm processes.out
  for i in $(seq 0 $(expr $NUM - 1))
  do
    PORT="56${i}1"
    PROXY="56${i}3"
    echo "starting kibana on port $PORT"
    nohup node scripts/kibana.js --dev.basePathProxyTarget=$PROXY --server.port=$PORT --migrations.enableV2=true --dev --no-watch --no-optimizer > nohup_$i.out &
    PROCESS_ID=$!
    echo "${PROCESS_ID}" >> processes.out
  done
  exit 0;
fi
