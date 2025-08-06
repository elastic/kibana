/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateYamlSchemaFromConnectors } from '@kbn/workflows';

// TODO: replace with dynamically fetching connectors actions and subactions via ActionsClient or other service once we decide on that.

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
    type: 'slack',
    params: [
      {
        name: 'message',
        type: 'string' as const,
      },
    ],
  },
  {
    type: 'inference.unified_completion',
    params: [
      {
        name: 'body',
        type: 'object' as const,
        properties: {
          messages: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                role: { type: 'string' as const },
                content: { type: 'string' as const },
              },
            },
          },
        },
      },
    ],
  },
  {
    type: 'inference.completion',
    params: [
      {
        name: 'input',
        type: 'string' as const,
      },
    ],
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
