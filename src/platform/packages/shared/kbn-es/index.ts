/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { run } from './src/cli';
export { Cluster } from './src/cluster';
export {
  SYSTEM_INDICES_SUPERUSER,
  SYSTEM_INDICES_SUPERUSER_PASSWORD,
  ELASTIC_SERVERLESS_SUPERUSER,
  ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
  SERVERLESS_NODES,
  ES_SERVERLESS_REPO_KIBANA,
  ES_SERVERLESS_REPO_ELASTICSEARCH,
  LINKED_CLUSTER_PORT_OFFSET,
  getServerlessNodes,
  getSharedServerlessParams,
  getDockerFileMountPath,
  verifyDockerInstalled,
  maybeCreateDockerNetwork,
  type ServerlessProjectType,
  serverlessProjectTypes,
  isServerlessProjectType,
  type ServerlessProductTier,
  serverlessProductTiers,
  isServerlessProjectTier,
  readRolesFromResource,
  readRolesDescriptorsFromResource,
} from './src/utils';
export { getUiamContainers } from './src/utils/docker_uiam';
export type { ArtifactLicense } from './src/artifact';
export {
  SERVERLESS_ROLES_ROOT_PATH,
  STATEFUL_ROLES_ROOT_PATH,
  SERVERLESS_SECRETS_DIR,
} from './src/paths';
export {
  EIS_QA_URL,
  EIS_ES_ARG,
  createBasicAuth,
  resolveCcmApiKey,
  setCcmApiKey,
  eisHttpRequest,
  waitForEisEsReady,
} from './src/eis/eis_setup';
export type { EisElasticsearchConnection } from './src/eis/eis_setup';
