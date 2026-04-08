/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorAuthStatusMap, ConnectorUserAuthStatus } from '../../types';

export interface ConnectorAuthStatusApiResponse {
  results: Record<string, { user_auth_status: ConnectorUserAuthStatus }>;
}

export const transformConnectorAuthStatusResponse = (
  response: ConnectorAuthStatusApiResponse
): ConnectorAuthStatusMap => {
  const { results } = response;
  return Object.fromEntries(
    Object.entries(results).map(([connectorId, { user_auth_status: userAuthStatus }]) => [
      connectorId,
      { userAuthStatus },
    ])
  );
};
