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

  // todo this code was better parallelized before
  const searchMatches = await Promise.all(
    (await indexPatternsService.find(searchString)).map((d) => indexPatternsService.toDataView(d))
  );

  const defaultDataViewLazy = await indexPatternsService.getDefault();
  const defaultDataView = defaultDataViewLazy
    ? await indexPatternsService.toDataView(defaultDataViewLazy)
    : null;

  const matchesById = await Promise.all([
    ...searchIdsList.map((id) => indexPatternsService.getLegacy(id)),
  ]);

  const exactMatches = [
    ...searchMatches.filter((ip) => searchStringList.includes(ip.title)),
    ...matchesById,
  ];

  const allMatches =
    exactMatches.length === indexPatternStrings.length
      ? exactMatches
      : [...exactMatches, defaultDataView];

  return allMatches.filter((d: DataView | null): d is DataView => d != null);
}
