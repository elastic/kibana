/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isString } from 'lodash';
import { getConnectorSpec } from '../get_connector_spec';

/**
 * Whether the spec marks this auth type `isInternal` — Kibana sets those credentials, so a user must
 * never supply them. Use it to reject create/update, not to gate execution: the connectors Kibana
 * provisioned this way have to keep working.
 */
export const isInternalAuthType = (
  connectorTypeId: string,
  authTypeId: string | undefined
): boolean => {
  if (!authTypeId) {
    return false;
  }

  const authTypes = getConnectorSpec(connectorTypeId)?.auth?.types ?? [];

  return authTypes.some(
    (authType) =>
      !isString(authType) && authType.type === authTypeId && authType.isInternal === true
  );
};
