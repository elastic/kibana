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

const connectors: ConnectorContract[] = [
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
  // Internal Elasticsearch actions
  {
    type: 'elasticsearch.search.query',
    connectorIdRequired: false,
    paramsSchema: z.object({
      // Current raw API structure
      request: z
        .object({
          method: z.enum(['GET', 'POST']).optional(),
          path: z.string(),
          body: z.any().optional(),
          query: z.record(z.any()).optional(), // URL query params
        })
        .optional(),
      // Sugar syntax (alternative to request)
      index: z.string().optional(),
      query: z.any().optional(),
      size: z.number().optional(),
      from: z.number().optional(),
      sort: z.any().optional(),
      _source: z.any().optional(),
      aggs: z.any().optional(),
    }),
    outputSchema: z.object({
      hits: z.object({
        total: z.object({
          value: z.number(),
          relation: z.string(),
        }),
        hits: z.array(z.any()),
      }),
      took: z.number(),
      timed_out: z.boolean(),
      aggregations: z.any().optional(),
    }),
  },
  {
    type: 'elasticsearch.indices.create',
    connectorIdRequired: false,
    paramsSchema: z.object({
      // Raw API structure
      request: z
        .object({
          method: z.enum(['PUT', 'POST']).optional(),
          path: z.string(),
          body: z.any().optional(),
        })
        .optional(),
      // Sugar syntax
      index: z.string().optional(),
      mappings: z.any().optional(),
      settings: z.any().optional(),
      aliases: z.any().optional(),
    }),
    outputSchema: z.object({
      acknowledged: z.boolean(),
      shards_acknowledged: z.boolean(),
      index: z.string(),
    }),
  },
  // More Elasticsearch actions
  {
    type: 'elasticsearch.indices.delete',
    connectorIdRequired: false,
    paramsSchema: z.object({
      index: z.string(),
    }),
    outputSchema: z.object({
      acknowledged: z.boolean(),
    }),
  },
  {
    type: 'elasticsearch.cluster.health',
    connectorIdRequired: false,
    paramsSchema: z.object({
      index: z.string().optional(),
      level: z.enum(['cluster', 'indices', 'shards']).optional(),
    }),
    outputSchema: z.object({
      cluster_name: z.string(),
      status: z.enum(['green', 'yellow', 'red']),
      number_of_nodes: z.number(),
    }),
  },
  // Internal Kibana actions
  {
    type: 'kibana.cases.create',
    connectorIdRequired: false,
    paramsSchema: z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string()).optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assignees: z.array(z.string()).optional(),
    }),
    outputSchema: z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.string(),
      created_at: z.string(),
      created_by: z.object({
        username: z.string(),
      }),
    }),
  },
  {
    type: 'kibana.spaces.get',
    connectorIdRequired: false,
    paramsSchema: z.object({
      space_id: z.string().optional(),
    }),
    outputSchema: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      disabledFeatures: z.array(z.string()),
    }),
  },
  {
    type: 'kibana.alerts.find',
    connectorIdRequired: false,
    paramsSchema: z.object({
      page: z.number().optional(),
      per_page: z.number().optional(),
      filter: z.string().optional(),
    }),
    outputSchema: z.object({
      page: z.number(),
      per_page: z.number(),
      total: z.number(),
      data: z.array(z.any()),
    }),
  },
];

export const getOutputSchemaForStepType = (stepType: string) => {
  const connector = connectors.find((c) => c.type === stepType);
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
