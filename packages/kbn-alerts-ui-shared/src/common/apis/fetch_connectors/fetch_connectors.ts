/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { ActionConnector } from '../../types';
import { transformConnectorResponse } from './transform_connectors_response';
import { BASE_ACTION_API_PATH, INTERNAL_BASE_ACTION_API_PATH } from '../../constants';

export async function fetchConnectors({
  http,
  includeSystemActions = false,
}: {
  http: HttpSetup;
  includeSystemActions?: boolean;
}): Promise<ActionConnector[]> {
  // Use the internal get_all_system route to load all action connectors and preconfigured system action connectors
  // This is necessary to load UI elements that require system action connectors, even if they're not selectable and
  // editable from the connector selection UI like a normal action connector.
  const path = includeSystemActions
    ? `${INTERNAL_BASE_ACTION_API_PATH}/connectors`
    : `${BASE_ACTION_API_PATH}/connectors`;

  const res = await http.get<Parameters<typeof transformConnectorResponse>[0]>(path);

  return transformConnectorResponse(res) as ActionConnector[];
}
