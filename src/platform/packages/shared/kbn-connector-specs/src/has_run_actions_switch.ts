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
 * Whether the connector form shows a Run actions switch: a dual connector with at least one auth
 * type that takes credentials.
 */
export const hasRunActionsSwitch = (spec: ConnectorSpec | undefined): boolean => {
  if (spec === undefined || !isDualConnectorSpec(spec)) {
    return false;
  }
  return (spec.auth?.types ?? []).some(
    (authType) => (typeof authType === 'string' ? authType : authType.type) !== NO_AUTH_TYPE_ID
  );
};
