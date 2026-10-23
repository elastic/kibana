/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GetConnectorSpecResponse } from '@kbn/actions-plugin/common';
import { resolveActionScope } from '@kbn/connector-specs';
import type { BrowserConnectorSpecDetail } from './types';

export const transformConnectorSpecDetailResponse = (
  wire: GetConnectorSpecResponse
): BrowserConnectorSpecDetail => ({
  id: wire.metadata.id,
  displayName: wire.metadata.display_name,
  description: wire.metadata.description,
  ...(wire.metadata.icon !== undefined ? { icon: wire.metadata.icon } : {}),
  ...(wire.metadata.docs_url !== undefined ? { docsUrl: wire.metadata.docs_url } : {}),
  minimumLicense: wire.metadata.minimum_license as BrowserConnectorSpecDetail['minimumLicense'],
  isTechnicalPreview: wire.metadata.is_technical_preview ?? false,
  supportedFeatureIds: wire.metadata.supported_feature_ids,
  authTypeIds: wire.auth_type_ids ?? [],
  isTestable: wire.is_testable ?? false,
  hasInboundEvents: wire.has_inbound_events ?? false,
  isInboundOnly: wire.is_inbound_only ?? false,
  isEarsExperimental: wire.is_ears_experimental ?? false,
  formSchema: wire.schema,
  actions: (wire.actions ?? []).map(
    ({ input_schema: inputSchema, name, description, is_tool: isTool, scope }) => ({
      name,
      ...(description !== undefined ? { description } : {}),
      isTool,
      scope: resolveActionScope({ scope, isTool }),
      inputSchema: inputSchema ?? {},
    })
  ),
});
