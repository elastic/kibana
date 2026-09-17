/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorMetadata } from '@kbn/connector-specs-common';
import type { ConnectorSpec } from '../connector_spec';
import { isInboundOnlyConnectorSpec } from '../is_inbound_only_connector_spec';

export interface ConnectorSpecCatalogAction {
  description?: string;
  isTool?: boolean;
  inputJsonSchema: Record<string, unknown>;
}

export interface ConnectorSpecCatalogEventDefinition {
  eventId: string;
  title: string;
  description: string;
  eventJsonSchema: Record<string, unknown>;
}

export interface ConnectorSpecCatalogEntry {
  id: string;
  metadata: ConnectorMetadata;
  isInboundOnly: boolean;
  actions: Record<string, ConnectorSpecCatalogAction>;
  events?: {
    definitions: ConnectorSpecCatalogEventDefinition[];
  };
}

const toJsonSchema = (schema: z.ZodType): Record<string, unknown> =>
  z.toJSONSchema(schema) as Record<string, unknown>;

export function serializeConnectorSpecCatalogEntry(spec: ConnectorSpec): ConnectorSpecCatalogEntry {
  const actions: Record<string, ConnectorSpecCatalogAction> = {};
  for (const [name, action] of Object.entries(spec.actions)) {
    actions[name] = {
      ...(action.description !== undefined ? { description: action.description } : {}),
      ...(action.isTool !== undefined ? { isTool: action.isTool } : {}),
      inputJsonSchema: toJsonSchema(action.input),
    };
  }

  const eventDefinitions = spec.events
    ? Object.values(spec.events.definitions).map((definition) => ({
        eventId: definition.eventId,
        title: definition.title,
        description: definition.description,
        eventJsonSchema: toJsonSchema(definition.eventSchema),
      }))
    : [];

  return {
    id: spec.metadata.id,
    metadata: spec.metadata,
    isInboundOnly: isInboundOnlyConnectorSpec(spec),
    actions,
    ...(eventDefinitions.length > 0 ? { events: { definitions: eventDefinitions } } : {}),
  };
}
