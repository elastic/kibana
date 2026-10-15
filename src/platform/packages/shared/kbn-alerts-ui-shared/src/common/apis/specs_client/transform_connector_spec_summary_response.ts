/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ConnectorSpecSummary,
  ConnectorSpecSummaryResponse,
} from '@kbn/actions-plugin/common';
import { resolveActionScope } from '@kbn/connector-specs';

export const transformConnectorSpecSummaryResponse = (
  wire: ConnectorSpecSummaryResponse
): ConnectorSpecSummary => ({
  id: wire.id,
  displayName: wire.display_name,
  description: wire.description,
  ...(wire.icon !== undefined ? { icon: wire.icon } : {}),
  ...(wire.docs_url !== undefined ? { docsUrl: wire.docs_url } : {}),
  minimumLicense: wire.minimum_license as ConnectorSpecSummary['minimumLicense'],
  isTechnicalPreview: wire.is_technical_preview ?? false,
  supportedFeatureIds: wire.supported_feature_ids,
  availability: {
    enabled: wire.availability?.enabled ?? false,
    enabledInConfig: wire.availability?.enabled_in_config ?? false,
    enabledInLicense: wire.availability?.enabled_in_license ?? false,
    isDeprecated: wire.availability?.is_deprecated ?? false,
  },
  authTypeIds: wire.auth_type_ids ?? [],
  isTestable: wire.is_testable ?? false,
  hasInboundEvents: wire.has_inbound_events ?? false,
  isInboundOnly: wire.is_inbound_only ?? false,
  isEarsExperimental: wire.is_ears_experimental ?? false,
  actions: (wire.actions ?? []).map((action) => ({
    name: action.name,
    ...(action.description !== undefined ? { description: action.description } : {}),
    isTool: action.is_tool,
    scope: resolveActionScope({ scope: action.scope, isTool: action.is_tool }),
  })),
});
