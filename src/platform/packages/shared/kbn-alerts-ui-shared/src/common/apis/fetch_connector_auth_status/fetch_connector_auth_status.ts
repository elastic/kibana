/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { ConnectorAuthStatusMap } from '@kbn/actions-types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';
import type { ConnectorAuthStatusApiResponse } from './transform_connector_auth_status_response';
import { transformConnectorAuthStatusResponse } from './transform_connector_auth_status_response';

export async function fetchConnectorAuthStatus({
  http,
}: {
  http: HttpSetup;
}): Promise<ConnectorAuthStatusMap> {
  const res = await http.post<ConnectorAuthStatusApiResponse>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connectors/_me/auth_status`,
    {
      body: JSON.stringify({}),
    }
  );

  return transformConnectorAuthStatusResponse(res);
}
