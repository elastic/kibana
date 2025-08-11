/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConnectorContract, generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { z } from '@kbn/zod';

// TODO: replace with dynamically fetching connectors actions and subactions via ActionsClient or other service once we decide on that.

const connectors: ConnectorContract[] = [
  {
    type: 'console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.object({
      message: z.string(),
    }),
  },
  {
    type: 'slack',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.object({
      message: z.string(),
    }),
  },
  {
    type: 'inference.unified_completion',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        body: z.object({
          messages: z.array(
            z.object({
              role: z.string(),
              content: z.string(),
            })
          ),
        }),
      })
      .required(),
    // TODO: use UnifiedChatCompleteResponseSchema from stack_connectors/common/inference/schema.ts
    outputSchema: z.object({
      id: z.string(),
      choices: z.array(
        z.object({
          message: z.object({
            content: z.string(),
            role: z.string(),
          }),
        })
      ),
    }),
  },
  {
    type: 'inference.completion',
    connectorIdRequired: true,
    paramsSchema: z.object({
      input: z.string(),
    }),
    outputSchema: z.array(
      z.object({
        result: z.string(),
      })
    ),
  },
  {
    type: 'delay',
    paramsSchema: z.object({
      delay: z.number(),
    }),
    outputSchema: z.null(),
  },
];

export const getOutputSchemaForStepType = (stepType: string) => {
  return connectors.find((c) => c.type === stepType)?.outputSchema ?? z.any();
};

export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(connectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(connectors, true);
