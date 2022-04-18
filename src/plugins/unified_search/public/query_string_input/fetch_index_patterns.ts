/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { DataViewsContract } from '@kbn/data-views-plugin/public';

export async function fetchIndexPatterns(
  indexPatternsService: DataViewsContract,
  indexPatternStrings: string[]
) {
  if (!indexPatternStrings || isEmpty(indexPatternStrings)) {
    return [];
  }

  const searchString = indexPatternStrings.map((string) => `"${string}"`).join(' | ');

  const exactMatches = (await indexPatternsService.find(searchString)).filter((ip) =>
    indexPatternStrings.includes(ip.title)
  );

  const allMatches =
    exactMatches.length === indexPatternStrings.length
      ? exactMatches
      : [...exactMatches, await indexPatternsService.getDefault()];

  return allMatches;
}
