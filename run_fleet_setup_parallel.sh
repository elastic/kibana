node scripts/jest_integration.js x-pack/platform/plugins/shared/fleet/server/integration_tests/es.test.ts &

sleep 5 
node scripts/jest_integration.js x-pack/platform/plugins/shared/fleet/server/integration_tests/fleet_setup.test.ts &
node scripts/jest_integration.js x-pack/platform/plugins/shared/fleet/server/integration_tests/fleet_setup.test.ts &
node scripts/jest_integration.js x-pack/platform/plugins/shared/fleet/server/integration_tests/fleet_setup.test.ts &
exit 0