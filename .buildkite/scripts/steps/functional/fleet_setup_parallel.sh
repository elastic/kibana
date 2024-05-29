set -euo pipefail

source .buildkite/scripts/steps/functional/common.sh

export JOB=kibana-fleet-setup-parallel
export KIBANA_INSTALL_DIR=${KIBANA_BUILD_LOCATION}

echo "--- Fleet Setup parallel tests"


set +e

node scripts/jest_integration.js x-pack/plugins/fleet/server/integration_tests/es.test.ts &

sleep 5 

node scripts/jest_integration.js x-pack/plugins/fleet/server/integration_tests/fleet_setup.test.ts &
node scripts/jest_integration.js x-pack/plugins/fleet/server/integration_tests/fleet_setup.test.ts &
node scripts/jest_integration.js x-pack/plugins/fleet/server/integration_tests/fleet_setup.test.ts &

exit 0