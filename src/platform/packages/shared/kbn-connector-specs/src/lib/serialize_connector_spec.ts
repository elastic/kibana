/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';
import { isInboundOnlyConnectorSpec } from '../is_inbound_only_connector_spec';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';

export interface SerializeConnectorSpecOptions {
  isPfxEnabled: boolean;
  isEarsEnabled: boolean;
  isEarsExperimentalEnabled: boolean;
}

export interface SerializedConnectorSpecAction {
  description?: string;
  isTool?: boolean;
  input: Record<string, unknown>;
}

export interface SerializedConnectorSpecEventDefinition {
  eventId: string;
  title: string;
  description: string;
  eventSchema: Record<string, unknown>;
}

export interface SerializedConnectorSpec {
  metadata: ConnectorSpec['metadata'];
  schema: Record<string, unknown>;
  isInboundOnly: boolean;
  actions: Record<string, SerializedConnectorSpecAction>;
  events?: { definitions: SerializedConnectorSpecEventDefinition[] };
}

const toJsonSchema = (schema: z.ZodType): Record<string, unknown> =>
  z.toJSONSchema(schema) as Record<string, unknown>;

export function serializeConnectorSpec(
  spec: ConnectorSpec,
  options?: SerializeConnectorSpecOptions
): SerializedConnectorSpec {
  const combinedZodSchema = z
    .object({
      config: spec.schema ?? z.object({}),
      secrets: generateSecretsSchemaFromSpec(spec.auth, options),
    })
    .strict();

  const jsonSchema = z.toJSONSchema(combinedZodSchema);

  const actions: Record<string, SerializedConnectorSpecAction> = {};
  for (const [name, action] of Object.entries(spec.actions)) {
    try {
      actions[name] = {
        ...(action.description !== undefined ? { description: action.description } : {}),
        ...(action.isTool !== undefined ? { isTool: action.isTool } : {}),
        input: toJsonSchema(action.input),
      };
    } catch {
      // Skip actions whose input cannot be represented as JSON Schema.
    }
  }

  const eventDefinitions: SerializedConnectorSpecEventDefinition[] = [];
  if (spec.events) {
    for (const definition of Object.values(spec.events.definitions)) {
      try {
        eventDefinitions.push({
          eventId: definition.eventId,
          title: definition.title,
          description: definition.description,
          eventSchema: toJsonSchema(definition.eventSchema),
        });
      } catch {
        // Skip events whose payload cannot be represented as JSON Schema.
      }
    }
  }

  return {
    metadata: spec.metadata,
    schema: jsonSchema as Record<string, unknown>,
    isInboundOnly: isInboundOnlyConnectorSpec(spec),
    actions,
    ...(eventDefinitions.length > 0 ? { events: { definitions: eventDefinitions } } : {}),
  };
}
