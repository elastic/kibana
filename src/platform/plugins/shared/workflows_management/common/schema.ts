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
import { GENERATED_ELASTICSEARCH_CONNECTORS } from './generated_es_connectors';
import { GENERATED_KIBANA_CONNECTORS } from './generated_kibana_connectors';
import { ENHANCED_ELASTICSEARCH_CONNECTORS, mergeEnhancedConnectors } from './enhanced_es_connectors';

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

/**
 * Elasticsearch Connector Generation
 *
 * This system provides ConnectorContract[] for all Elasticsearch APIs
 * by using pre-generated definitions from Console's API specifications.
 *
 * Benefits:
 * 1. **Schema Validation**: Zod schemas for all ES API parameters
 * 2. **Autocomplete**: Monaco YAML editor gets full autocomplete via JSON Schema
 * 3. **Comprehensive Coverage**: 568 Elasticsearch APIs supported
 * 4. **Browser Compatible**: No file system access required
 *
 * The generated connectors include:
 * - All Console API definitions converted to Zod schemas
 * - Path parameters extracted from patterns (e.g., {index}, {id})
 * - URL parameters with proper types (flags, enums, strings, numbers)
 * - Proper ConnectorContract format for workflow execution
 *
 * To regenerate: run `node scripts/generate_es_connectors.js`
 */
function generateElasticsearchConnectors(): ConnectorContract[] {
  // Return enhanced connectors (merge generated with enhanced definitions)
  return mergeEnhancedConnectors(
    GENERATED_ELASTICSEARCH_CONNECTORS,
    ENHANCED_ELASTICSEARCH_CONNECTORS
  );
}

function generateKibanaConnectors(): ConnectorContract[] {
  // Return the pre-generated Kibana connectors (build-time generated, browser-safe)
  return GENERATED_KIBANA_CONNECTORS;
}

// Combine static connectors with dynamic Elasticsearch and Kibana connectors
export function getAllConnectors(): ConnectorContract[] {
  const elasticsearchConnectors = generateElasticsearchConnectors();
  const kibanaConnectors = generateKibanaConnectors();
  return [...staticConnectors, ...elasticsearchConnectors, ...kibanaConnectors];
}

export const getOutputSchemaForStepType = (stepType: string) => {
  const allConnectors = getAllConnectors();
  const connector = allConnectors.find((c) => c.type === stepType);
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

// Dynamic schemas that include all connectors (static + Elasticsearch)
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(getAllConnectors());
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(getAllConnectors(), true);

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
  data: z.array(z.union([AlertSchema, z.any()])),
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
