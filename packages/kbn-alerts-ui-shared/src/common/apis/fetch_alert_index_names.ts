/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

export async function fetchAlertIndexNames({
  http,
  features,
}: {
  http: HttpSetup;
  features: string;
}): Promise<string[]> {
  const { index_name: indexNamesStr = [] } = await http.get<{ index_name: string[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/index`,
    {
      query: { features },
    }
  );
  return indexNamesStr;
}
