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

// Static connectors used for schema generation
const staticConnectors: ConnectorContract[] = [
  {
    type: 'console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
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
  // Basic Elasticsearch actions as fallback
  {
    type: 'elasticsearch.search',
    connectorIdRequired: false,
    paramsSchema: z.object({
      index: z.string().optional(),
      query: z.any().optional(),
      size: z.number().optional(),
      from: z.number().optional(),
      sort: z.any().optional(),
    }),
    outputSchema: z.object({
      hits: z.object({
        total: z.object({
          value: z.number(),
        }),
        hits: z.array(z.any()),
      }),
    }),
  },
  {
    type: 'elasticsearch.search.query',
    connectorIdRequired: false,
    paramsSchema: z.object({
      index: z.string().optional(),
      query: z.any().optional(),
      size: z.number().optional(),
      from: z.number().optional(),
      sort: z.any().optional(),
    }),
    outputSchema: z.object({
      hits: z.object({
        total: z.object({
          value: z.number(),
        }),
        hits: z.array(z.any()),
      }),
    }),
  },
  {
    type: 'kibana.cases.create',
    connectorIdRequired: false,
    paramsSchema: z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()).optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    }),
    outputSchema: z.object({
      id: z.string(),
      title: z.string(),
    }),
  },
  // Generic request types for raw API calls
  {
    type: 'elasticsearch.request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      params: z.any().optional(),
    }),
    outputSchema: z.any(),
  },
  {
    type: 'kibana.request',
    connectorIdRequired: false,
    paramsSchema: z.object({
      method: z.string(),
      path: z.string(),
      body: z.any().optional(),
      headers: z.any().optional(),
    }),
    outputSchema: z.any(),
  },
];

export const getOutputSchemaForStepType = (stepType: string) => {
  const connector = staticConnectors.find((c) => c.type === stepType);
  if (connector) {
    return connector.outputSchema;
  }

  // Handle internal actions with pattern matching
  if (stepType.startsWith('elasticsearch.')) {
    return z.any(); // Elasticsearch responses vary widely by API
  }

  if (stepType.startsWith('kibana.')) {
    return z.any(); // Kibana API responses vary by endpoint
  }

  return z.any();
};

// Static schemas for initial load
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(staticConnectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(staticConnectors, true);

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
