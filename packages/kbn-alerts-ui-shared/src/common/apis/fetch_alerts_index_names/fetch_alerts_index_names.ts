/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformAlertsIndexNamesResponse } from './transform_alerts_index_names_response';
import { BASE_RAC_ALERTS_API_PATH } from '../../constants';
import { FetchAlertsIndexNamesParams } from './types';

export const fetchAlertsIndexNames = async ({ http, featureIds }: FetchAlertsIndexNamesParams) => {
  return http
    .get<{ index_name: string[]; has_read_index_privilege: boolean }>(
      `${BASE_RAC_ALERTS_API_PATH}/index`,
      {
        query: { features: featureIds.join(',') },
      }
    )
    .then(transformAlertsIndexNamesResponse);
};
