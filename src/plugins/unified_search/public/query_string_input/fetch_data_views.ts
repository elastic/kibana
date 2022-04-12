/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { DataViewsContract } from '../../../data_views/public';

export async function fetchDataViews(
  dataViewsService: DataViewsContract,
  dataViewStrings: string[]
) {
  if (!dataViewStrings || isEmpty(dataViewStrings)) {
    return [];
  }

  const searchString = dataViewStrings.map((string) => `"${string}"`).join(' | ');

  const exactMatches = (await dataViewsService.find(searchString)).filter((ip) =>
    dataViewStrings.includes(ip.title)
  );

  const allMatches =
    exactMatches.length === dataViewStrings.length
      ? exactMatches
      : [...exactMatches, await dataViewsService.getDefault()];

  return allMatches;
}
