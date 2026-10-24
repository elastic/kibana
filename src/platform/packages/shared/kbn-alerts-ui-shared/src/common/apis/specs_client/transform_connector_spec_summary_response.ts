/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpecActionSummary, ConnectorSpecSummary } from '@kbn/actions-plugin/common';
import { resolveActionScope } from '@kbn/connector-specs';

interface ConnectorSpecAvailabilityWire {
  enabled?: boolean;
  enabled_in_config?: boolean;
  enabled_in_license?: boolean;
  is_deprecated?: boolean;
}

export interface ConnectorSpecSummaryWire {
  id: string;
  display_name: string;
  description: string;
  icon?: string;
  docs_url?: string;
  minimum_license: ConnectorSpecSummary['minimumLicense'];
  is_technical_preview?: boolean;
  supported_feature_ids: string[];
  availability?: ConnectorSpecAvailabilityWire;
  auth_type_ids?: string[];
  is_testable?: boolean;
  has_inbound_events?: boolean;
  is_inbound_only?: boolean;
  is_ears_experimental?: boolean;
  actions?: Array<{
    name: string;
    description?: string;
    is_tool: boolean;
    scope?: ConnectorSpecActionSummary['scope'];
  }>;
}

export const transformConnectorSpecSummaryResponse = (
  wire: ConnectorSpecSummaryWire
): ConnectorSpecSummary => ({
  id: wire.id,
  displayName: wire.display_name,
  description: wire.description,
  ...(wire.icon !== undefined ? { icon: wire.icon } : {}),
  ...(wire.docs_url !== undefined ? { docsUrl: wire.docs_url } : {}),
  minimumLicense: wire.minimum_license,
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
