/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContract } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { z } from '@kbn/zod';

// TODO: replace with dynamically fetching connectors actions and subactions via ActionsClient or other service once we decide on that.
// type ActionTypeExecutorResult = ActionTypeExecutorResult<unknown>;

function createConnectorOutputSchema(dataSchema: z.ZodType) {
  return z.object({
    actionId: z.string(),
    status: z.enum(['ok', 'error']),
    message: z.string().optional(),
    serviceMessage: z.string().optional(),
    data: dataSchema,
  });
}

const connectors: ConnectorContract[] = [
  {
    type: 'console',
    actionTypeId: '_console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
  },
  {
    type: 'slack',
    actionTypeId: '.slack',
    connectorId: z.string(),
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: createConnectorOutputSchema(
      z.object({
        message: z.string(),
      })
    ),
  },
  {
    type: 'inference.unified_completion',
    actionTypeId: '.inference',
    connectorId: z.string(),
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
    outputSchema: createConnectorOutputSchema(
      z.object({
        id: z.string(),
        choices: z.array(
          z.object({
            message: z.object({
              content: z.string(),
              role: z.string(),
            }),
          })
        ),
      })
    ),
  },
  {
    type: 'inference.completion',
    actionTypeId: '.inference',
    connectorId: z.string(),
    paramsSchema: z.object({
      input: z.string(),
    }),
    outputSchema: createConnectorOutputSchema(
      z.array(
        z.object({
          result: z.string(),
        })
      )
    ),
  },
];

export function getConnectorContracts(actionTypeId: string, connectorIds?: string[]) {
  return connectors
    .filter((c) => c.actionTypeId === actionTypeId)
    .map((c) => {
      if (connectorIds && connectorIds.length > 0) {
        return {
          ...c,
          // @ts-expect-error TODO: fix this
          connectorId: z.union(connectorIds.map((id) => z.literal(id))),
        };
      }
      return c;
    });
}

export const getOutputSchemaForStepType = (stepType: string) => {
  return connectors.find((c) => c.type === stepType)?.outputSchema ?? z.any();
};

export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(connectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(connectors, true);

// Partially recreated from x-pack/platform/plugins/shared/alerting/server/connector_adapters/types.ts
// TODO: replace with dynamic schema

// TODO: import AlertSchema from from '@kbn/alerts-as-data-utils' once it exported, now only type is exported
const AlertSchema = z.object({
  _id: z.string(),
  _index: z.string(),
  kibana: z.object({
    alert: z.any(),
  }),
  '@timestamp': z.string(),
});

const SummarizedAlertsChunkSchema = z.object({
  count: z.number(),
  data: z.array(AlertSchema),
});

const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  consumer: z.string(),
  producer: z.string(),
  ruleTypeId: z.string(),
});

export const EventSchema = z.object({
  alerts: z.object({
    new: SummarizedAlertsChunkSchema,
    ongoing: SummarizedAlertsChunkSchema,
    recovered: SummarizedAlertsChunkSchema,
    all: SummarizedAlertsChunkSchema,
  }),
  rule: RuleSchema,
  spaceId: z.string(),
  params: z.any(),
});
