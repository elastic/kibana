/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpecDetail, GetConnectorSpecResponse } from '@kbn/actions-plugin/common';
import { transformConnectorSpecSummaryResponse } from './transform_connector_spec_summary_response';

export const transformConnectorSpecDetailResponse = (
  wire: GetConnectorSpecResponse
): ConnectorSpecDetail => {
  const summary = transformConnectorSpecSummaryResponse({
    id: wire.metadata.id,
    display_name: wire.metadata.display_name,
    description: wire.metadata.description,
    icon: wire.metadata.icon,
    docs_url: wire.metadata.docs_url,
    minimum_license: wire.metadata.minimum_license,
    is_technical_preview: wire.metadata.is_technical_preview,
    supported_feature_ids: wire.metadata.supported_feature_ids,
    availability: wire.availability,
    auth_type_ids: wire.auth_type_ids,
    is_testable: wire.is_testable,
    has_inbound_events: wire.has_inbound_events,
    is_inbound_only: wire.is_inbound_only,
    is_ears_experimental: wire.is_ears_experimental,
    actions: (wire.actions ?? []).map(({ input_schema: _inputSchema, ...action }) => action),
  });

  return {
    ...summary,
    formSchema: wire.schema,
    ...(wire.skill !== undefined ? { skill: wire.skill } : {}),
    actions: summary.actions.map((action, index) => ({
      ...action,
      inputSchema: wire.actions?.[index]?.input_schema ?? {},
    })),
  };
};
