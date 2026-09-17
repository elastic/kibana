/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorMetadata } from '@kbn/connector-specs-common';

/**
 * Wire JSON from GET /internal/actions/connector_types/{id}/spec
 * (snake_case metadata; matches server `GetConnectorSpecResponseV1`).
 */
export interface ConnectorSpecWireResponse {
  metadata: {
    id: string;
    display_name: string;
    description: string;
    minimum_license: string;
    supported_feature_ids: string[];
    icon?: string;
    docs_url?: string;
    is_technical_preview?: boolean;
  };
  schema: Record<string, unknown>;
  is_testable: boolean;
  is_inbound_only: boolean;
  actions: Record<
    string,
    {
      description?: string;
      is_tool?: boolean;
      input: Record<string, unknown>;
    }
  >;
  events?: {
    definitions: Array<{
      event_id: string;
      title: string;
      description: string;
      event_schema: Record<string, unknown>;
    }>;
  };
}

export interface ConnectorSpecAction {
  description?: string;
  isTool?: boolean;
  input: Record<string, unknown>;
}

export interface ConnectorSpecEventDefinition {
  eventId: string;
  title: string;
  description: string;
  eventSchema: Record<string, unknown>;
}

/** Client-side connector spec after normalising API casing. */
export interface ConnectorSpecResponse {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
  isTestable: boolean;
  isInboundOnly: boolean;
  actions: Record<string, ConnectorSpecAction>;
  events?: { definitions: ConnectorSpecEventDefinition[] };
}

export function transformConnectorSpecResponse(
  wire: ConnectorSpecWireResponse
): ConnectorSpecResponse {
  const {
    display_name: displayName,
    minimum_license: minimumLicense,
    supported_feature_ids: supportedFeatureIds,
    docs_url: docsUrl,
    is_technical_preview: isTechnicalPreview,
    icon,
    description,
    id,
  } = wire.metadata;

  return {
    metadata: {
      id,
      displayName,
      description,
      minimumLicense: minimumLicense as ConnectorMetadata['minimumLicense'],
      supportedFeatureIds: supportedFeatureIds as ConnectorMetadata['supportedFeatureIds'],
      ...(icon !== undefined ? { icon } : {}),
      ...(docsUrl !== undefined ? { docsUrl } : {}),
      ...(isTechnicalPreview !== undefined ? { isTechnicalPreview } : {}),
    },
    schema: wire.schema,
    isTestable: wire.is_testable,
    isInboundOnly: Boolean(wire.is_inbound_only),
    actions: Object.fromEntries(
      Object.entries(wire.actions ?? {}).map(([name, action]) => [
        name,
        {
          ...(action.description !== undefined ? { description: action.description } : {}),
          ...(action.is_tool !== undefined ? { isTool: action.is_tool } : {}),
          input: action.input,
        },
      ])
    ),
    ...(wire.events
      ? {
          events: {
            definitions: wire.events.definitions.map((definition) => ({
              eventId: definition.event_id,
              title: definition.title,
              description: definition.description,
              eventSchema: definition.event_schema,
            })),
          },
        }
      : {}),
  };
}
