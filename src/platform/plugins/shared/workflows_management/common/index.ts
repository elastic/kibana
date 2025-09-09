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

export const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflows-step-executions';
export const WORKFLOWS_EXECUTION_LOGS_INDEX = '.workflows-execution-logs';

// DO NOT IMPORT MODULES HERE. Otherwise it will inflate the initial plugin bundle size.
