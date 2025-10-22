/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  CI_PARALLEL_PROCESS_NUMBER,
  CI_PARALLEL_PROCESS_PREFIX,
} from './src/ci_parallel_process_prefix';

export { assignPorts } from './src/assign_ports';

export {
  TEST_ES_PORT,
  TEST_ES_HOST,
  TEST_REMOTE_ES_HOST,
  TEST_REMOTE_ES_PORT,
  TEST_ES_TRANSPORT_PORT,
  TEST_ES_02_PORT,
  TEST_ES_02_TRANSPORT_PORT,
  TEST_ES_03_PORT,
  TEST_ES_03_TRANSPORT_PORT,
  TEST_KIBANA_PORT,
  TEST_KIBANA_HOST,
  TEST_REMOTE_KIBANA_PORT,
  TEST_FLEET_HOST,
  TEST_FLEET_PORT,
  TEST_AGENTLESS_HOST,
  TEST_AGENTLESS_PORT,
  FLEET_PACKAGE_REGISTRY_PORT,
  SERVICE_NAMESPACE,
  ELASTIC_DOCKER_NETWORK_NAME,
} from './src/service_addresses';
