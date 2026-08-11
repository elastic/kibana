/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorAuthStatusMap, ConnectorUserAuthStatus } from '@kbn/actions-types';

export type ConnectorAuthStatusApiResponse = Record<
  string,
  { user_auth_status: ConnectorUserAuthStatus }
>;

export const transformConnectorAuthStatusResponse = (
  response: ConnectorAuthStatusApiResponse
): ConnectorAuthStatusMap => {
  return Object.fromEntries(
    Object.entries(response).map(([connectorId, { user_auth_status: userAuthStatus }]) => [
      connectorId,
      { userAuthStatus },
    ])
  );
};
