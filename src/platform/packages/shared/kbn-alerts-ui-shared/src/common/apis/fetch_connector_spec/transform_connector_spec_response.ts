/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorMetadata } from '@kbn/connector-specs';

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
}

/** Client-side connector spec after normalising API casing. */
export interface ConnectorSpecResponse {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
  isTestable: boolean;
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
  };
}
