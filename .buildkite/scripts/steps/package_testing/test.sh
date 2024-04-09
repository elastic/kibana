#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/../../common/util.sh"
source .buildkite/scripts/steps/artifacts/env.sh

# .buildkite/scripts/bootstrap.sh

# temporary adding this to get screenshots
is_test_execution_step

echo "--- Package Testing for $TEST_PACKAGE"

mkdir -p target
cd target
if [[ "$TEST_PACKAGE" == "deb" ]]; then
  download_artifact 'kibana-*-amd64.deb' . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  KIBANA_IP_ADDRESS="192.168.56.5"
elif [[ "$TEST_PACKAGE" == "rpm" ]]; then
  download_artifact 'kibana-*-x86_64.rpm' . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  KIBANA_IP_ADDRESS="192.168.56.6"
elif [[ "$TEST_PACKAGE" == "docker" ]]; then
  download_artifact "kibana-$KIBANA_PKG_VERSION*-docker-image.tar.gz" . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
  KIBANA_IP_ADDRESS="192.168.56.7"
elif [[ "$TEST_PACKAGE" == "fips" ]]; then
  download_artifact "kibana-*-linux-x86_64.tar.gz" . --build "018e7d6c-f037-430f-87f7-fa915fd919dc"
  KIBANA_IP_ADDRESS="192.168.56.8"
fi
cd ..

export VAGRANT_CWD=$PWD/test/package

if [[ "$TEST_PACKAGE" == "fips" ]]; then
  vagrant up "$TEST_PACKAGE"
else
  vagrant up "$TEST_PACKAGE" --no-provision
fi

node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.56.1 \
  -E discovery.type=single-node \
  --license=trial &
while ! timeout 1 bash -c "echo > /dev/tcp/localhost/9200"; do sleep 30; done

function echoKibanaLogs {
  if [[ "$TEST_PACKAGE" == "deb" ]] || [[ "$TEST_PACKAGE" == "rpm" ]]; then
    echo "--- /var/log/kibana/kibana.log "
    vagrant ssh $TEST_PACKAGE -t -c 'sudo cat /var/log/kibana/kibana.log'

    echo "--- Journal "
    vagrant ssh $TEST_PACKAGE -t -c 'sudo journalctl -u kibana.service --no-pager'
  elif [[ "$TEST_PACKAGE" == "docker" ]] || [[ "$TEST_PACKAGE" == "fips" ]]; then
    echo '--- Docker logs'
    vagrant ssh $TEST_PACKAGE -t -c 'sudo docker logs kibana'
  fi
}
trap "echoKibanaLogs" EXIT

vagrant provision "$TEST_PACKAGE"

export TEST_BROWSER_HEADLESS=1
export TEST_KIBANA_URL="http://elastic:changeme@$KIBANA_IP_ADDRESS:5601"
export TEST_ES_URL="http://elastic:changeme@192.168.56.1:9200"

echo "--- FTR - Reporting"

cd x-pack

node scripts/functional_test_runner.js --config test/functional/apps/visualize/config.ts --include-tag=smoke --quiet
