/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BASE_RAC_ALERTS_API_PATH } from '../../constants';
import { FetchAlertsIndexNamesParams } from './types';

export const fetchAlertsIndexNames = async ({ http, ruleTypeIds }: FetchAlertsIndexNamesParams) => {
  const { index_name: indexNames = [] } = await http.get<{ index_name: string[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/index`,
    {
      query: { ruleTypeIds },
    }
  );
  return indexNames;
};
