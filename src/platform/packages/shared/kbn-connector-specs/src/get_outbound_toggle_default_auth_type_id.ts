/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from './connector_spec';
import { isDualConnectorSpec } from './is_dual_connector_spec';

const NO_AUTH_TYPE_ID = 'none';

/**
 * Auth type the Outbound switch turns on for a dual connector that also offers no authentication,
 * or undefined when the connector gets no switch.
 */
export const getOutboundToggleDefaultAuthTypeId = (
  spec: ConnectorSpec | undefined
): string | undefined => {
  if (spec === undefined || !isDualConnectorSpec(spec)) {
    return undefined;
  }
  const authTypeIds = (spec.auth?.types ?? []).map((authType) =>
    typeof authType === 'string' ? authType : authType.type
  );
  if (!authTypeIds.includes(NO_AUTH_TYPE_ID)) {
    return undefined;
  }
  return authTypeIds.find((authTypeId) => authTypeId !== NO_AUTH_TYPE_ID);
};
