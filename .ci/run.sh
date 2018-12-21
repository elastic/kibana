#!/usr/bin/env bash

set -e

# move to Kibana root
cd "$(dirname "$0")/.."

.ci/instrument_ci_linux --output target/kibana-ci-log.nldjson -- ./.ci/_run.sh
