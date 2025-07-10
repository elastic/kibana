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
# Script to run multiple kibana nodes in parallel on the same machine.
# Make sure to run the script from kibana root directory. Some functions depend on the jq command-line utility
# being installed.
#
# bash src/platform/test/scripts/run_multiple_kibana_nodes.sh <function> [options]
# functions:
#   start [instances] [args] - start multiple kibanas (3 default)
#   es [args] - run elasticsearch
#   tail - show logs of all kibanas
#   kill - kills all started kibana processes
#   clean - clean up nohup files
#   kibana_index - search .kibana index against es
#

FN="$1"

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
  ARGS="$2"
  yarn es snapshot $ARGS
  exit 0;
fi

if [ "${FN}" == "kibana_index" ]; then
  # search the kibana index
  curl -XPOST http://elastic:changeme@localhost:9200/.kibana/_search -u elastic:changeme -d '' | jq
  exit 0;
fi

if [ "${FN}" == "start" ]; then
  NUM="$2"
  ARGS="$3"
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
    nohup node scripts/kibana.js --dev.basePathProxyTarget=$PROXY --server.port=$PORT --dev --no-watch --no-optimizer --no-base-path $ARGS > nohup_$i.out &
    PROCESS_ID=$!
    echo "${PROCESS_ID}" >> processes.out
  done
  exit 0;
fi
