/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core/public';
import { ActionType } from '@kbn/actions-types';
import { BASE_ACTION_API_PATH, INTERNAL_BASE_ACTION_API_PATH } from '../../constants';
import { transformConnectorTypesResponse } from './transform_connector_types_response';

export const fetchConnectorTypes = async ({
  http,
  featureId,
  includeSystemActions = false,
}: {
  http: HttpSetup;
  featureId?: string;
  includeSystemActions?: boolean;
}): Promise<ActionType[]> => {
  const path = includeSystemActions
    ? `${INTERNAL_BASE_ACTION_API_PATH}/connector_types`
    : `${BASE_ACTION_API_PATH}/connector_types`;

  const res = featureId
    ? await http.get<Parameters<typeof transformConnectorTypesResponse>[0]>(path, {
        query: {
          feature_id: featureId,
        },
      })
    : await http.get<Parameters<typeof transformConnectorTypesResponse>[0]>(path, {});
  return transformConnectorTypesResponse(res);
};
