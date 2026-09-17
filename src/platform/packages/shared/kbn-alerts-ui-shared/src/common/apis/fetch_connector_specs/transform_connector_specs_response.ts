/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorMetadata } from '@kbn/connector-specs-common';

export interface ConnectorSpecCatalogActionWire {
  description?: string;
  is_tool?: boolean;
  input_json_schema: Record<string, unknown>;
}

export interface ConnectorSpecCatalogEventWire {
  event_id: string;
  title: string;
  description: string;
  event_json_schema: Record<string, unknown>;
}

export interface ConnectorSpecCatalogEntryWire {
  id: string;
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
  is_inbound_only: boolean;
  actions: Record<string, ConnectorSpecCatalogActionWire>;
  events?: { definitions: ConnectorSpecCatalogEventWire[] };
}

export interface ConnectorSpecCatalogWireResponse {
  specs: ConnectorSpecCatalogEntryWire[];
}

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
  events?: { definitions: ConnectorSpecCatalogEventDefinition[] };
}

export function transformConnectorSpecsResponse(
  wire: ConnectorSpecCatalogWireResponse
): ConnectorSpecCatalogEntry[] {
  return wire.specs.map((entry) => {
    const {
      display_name: displayName,
      minimum_license: minimumLicense,
      supported_feature_ids: supportedFeatureIds,
      docs_url: docsUrl,
      is_technical_preview: isTechnicalPreview,
      icon,
      description,
      id,
    } = entry.metadata;

    return {
      id: entry.id,
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
      isInboundOnly: entry.is_inbound_only,
      actions: Object.fromEntries(
        Object.entries(entry.actions).map(([name, action]) => [
          name,
          {
            ...(action.description !== undefined ? { description: action.description } : {}),
            ...(action.is_tool !== undefined ? { isTool: action.is_tool } : {}),
            inputJsonSchema: action.input_json_schema,
          },
        ])
      ),
      ...(entry.events
        ? {
            events: {
              definitions: entry.events.definitions.map((definition) => ({
                eventId: definition.event_id,
                title: definition.title,
                description: definition.description,
                eventJsonSchema: definition.event_json_schema,
              })),
            },
          }
        : {}),
    };
  });
}
