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

export const WORKFLOWS_INDEX = '.workflows';
export const WORKFLOWS_EXECUTIONS_INDEX = '.workflow-executions';
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflow-step-executions';

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
];

export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(connectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(connectors, true);
