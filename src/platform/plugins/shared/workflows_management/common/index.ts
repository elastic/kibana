/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateYamlSchemaFromConnectors } from '@kbn/workflows';

export const PLUGIN_ID = 'workflows';
export const PLUGIN_NAME = 'Workflows';

export const WORKFLOWS_EXECUTIONS_INDEX = '.kibana-workflow-executions';
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.kibana-workflow-step-executions';
export const WORKFLOWS_EXECUTION_LOGS_INDEX = '.kibana-workflow-execution-logs';

const connectors = [
  {
    type: 'console',
    params: [
      {
        name: 'message',
        type: 'string' as const,
      },
    ],
  },
  {
    type: 'slack.sendMessage',
    params: [
      {
        name: 'message',
        type: 'string' as const,
      },
    ],
    // TODO: fetch from ActionsClient.getAll()
    availableConnectorIds: ['keep-playground', 'keep-demo'],
  },
  {
    type: 'delay',
    params: [
      {
        name: 'delay',
        type: 'number' as const,
      },
    ],
  },
];

export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(connectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(connectors, true);
