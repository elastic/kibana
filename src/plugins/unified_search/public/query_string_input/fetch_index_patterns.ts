/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';

export interface DataViewByIdOrTitle {
  type: 'title' | 'id';
  value: string;
}

export async function fetchIndexPatterns(
  indexPatternsService: DataViewsContract,
  indexPatternStrings: DataViewByIdOrTitle[]
): Promise<DataView[]> {
  console.error({ indexPatternStrings });
  if (!indexPatternStrings || isEmpty(indexPatternStrings)) {
    return [];
  }

  const searchStringList: string[] = [];
  const searchIdsList: string[] = [];
  for (const { type, value } of indexPatternStrings) {
    if (type === 'title') {
      searchStringList.push(value);
    } else {
      searchIdsList.push(value);
    }
  }

  const searchString = searchStringList.map((value) => `"${value}"`).join(' | ');

  const [searchMatches, ...matchesById] = await Promise.all([
    indexPatternsService.find(searchString),
    ...searchIdsList.map((id) => indexPatternsService.get(id)),
  ]);

  const exactMatches = [
    ...searchMatches.filter((ip) => searchStringList.includes(ip.title)),
    ...matchesById,
  ];

  console.error({ exactMatches });

  console.error('indexPatternStrings.length', indexPatternStrings.length);

  const allMatches =
    exactMatches.length === indexPatternStrings.length
      ? exactMatches
      : [...exactMatches, await indexPatternsService.getDefault()];

  console.error({ allMatches });

  const toReturn = allMatches.filter((d: DataView | null): d is DataView => d != null);
  console.error({ toReturn });
  return toReturn;
}
