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
import type { ConnectorConfig } from '.';

// TODO: replace with dynamically fetching connectors actions and subactions via ActionsClient or other service once we decide on that.
// type ActionTypeExecutorResult = ActionTypeExecutorResult<unknown>;

/**
 * Wraps output schema for a given data schema with the required fields for a connector output
 * @param dataSchema - The data schema for the connector output
 * @returns The connector output schema as returned from actions client
 */
function createConnectorOutputSchema(dataSchema: z.ZodType) {
  return z.object({
    actionId: z.string(),
    status: z.enum(['ok', 'error']),
    message: z.string().optional(),
    serviceMessage: z.string().optional(),
    data: dataSchema,
  });
}

// Hardcoded connectors, will be replaced with api once https://github.com/elastic/kibana-team/issues/1923 is resolved
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

/**
 * Enrich hardcoded connector contracts with the connector ids if provided
 * @param actionTypeId - The action type id
 * @param connectorIds - The connector ids
 * @returns The connector contracts
 */
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

export const getWorkflowZodSchemaFromConnectorConfig = (
  connectorConfig: ConnectorConfig,
  loose: boolean
) => {
  if (!connectorConfig) {
    return null;
  }
  // Add special non-connector step types: console
  const types = [...connectorConfig.types, '_console'];
  const connectorContracts: ConnectorContract[] = [];
  for (const type of types) {
    const contracts = getConnectorContracts(type, connectorConfig.nameMap[type]);
    connectorContracts.push(...contracts);
  }
  return generateYamlSchemaFromConnectors(connectorContracts, loose);
};

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
