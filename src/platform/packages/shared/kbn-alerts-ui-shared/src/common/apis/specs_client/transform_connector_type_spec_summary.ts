/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpecSummary, ConnectorTypeResponse } from '@kbn/actions-plugin/common';
import { transformConnectorSpecSummaryResponse } from './transform_connector_spec_summary_response';

export const transformConnectorTypeSpecSummary = (
  wire: ConnectorTypeResponse
): ConnectorSpecSummary | undefined => {
  if (
    wire.source !== 'spec' ||
    wire.description === undefined ||
    wire.auth_type_ids === undefined ||
    wire.has_inbound_events === undefined ||
    wire.is_inbound_only === undefined ||
    wire.is_ears_experimental === undefined ||
    wire.actions === undefined
  ) {
    return undefined;
  }

  return transformConnectorSpecSummaryResponse({
    id: wire.id,
    display_name: wire.name,
    description: wire.description,
    ...(wire.icon !== undefined ? { icon: wire.icon } : {}),
    ...(wire.docs_url !== undefined ? { docs_url: wire.docs_url } : {}),
    minimum_license: wire.minimum_license_required,
    is_technical_preview: wire.is_experimental ?? false,
    supported_feature_ids: wire.supported_feature_ids,
    availability: {
      enabled: wire.enabled,
      enabled_in_config: wire.enabled_in_config,
      enabled_in_license: wire.enabled_in_license,
      is_deprecated: wire.is_deprecated,
    },
    auth_type_ids: wire.auth_type_ids,
    is_testable: wire.is_testable,
    has_inbound_events: wire.has_inbound_events,
    is_inbound_only: wire.is_inbound_only,
    is_ears_experimental: wire.is_ears_experimental,
    actions: wire.actions,
  });
};
