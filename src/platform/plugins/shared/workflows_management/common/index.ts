/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'workflows';
export const PLUGIN_NAME = 'Workflows';

export const WORKFLOWS_INDEX = '.workflows-workflows';

export {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
} from '@kbn/workflows';

export const WORKFLOWS_DOCUMENTATION_URL = 'https://ela.st/workflows-docs';

// Export shared utilities that are needed by both server and client
// NOTE: buildRequestFromConnector removed from here to avoid main bundle bloat
// Import directly from './elasticsearch_request_builder' if needed

// DO NOT IMPORT MODULES HERE. Otherwise it will inflate the initial plugin bundle size.
