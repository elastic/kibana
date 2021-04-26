/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsContract } from 'src/plugins/data/public';
import { IndexPatternManagementStart } from '../plugin';
import type { IndexPatternTableItem } from './types';

export async function getIndexPatterns(
  defaultIndex: string,
  indexPatternManagementStart: IndexPatternManagementStart,
  indexPatternsService: IndexPatternsContract
) {
  const existingIndexPatterns = await indexPatternsService.getIdsWithTitle(true);
  const indexPatternsListItems = await Promise.all(
    existingIndexPatterns.map(async ({ id }) => {
      const isDefault = defaultIndex === id;
      return await getIndexPattern(
        id,
        isDefault,
        indexPatternManagementStart,
        indexPatternsService
      );
    })
  );

  return (
    indexPatternsListItems.sort((a, b) => {
      if (a.sort < b.sort) {
        return -1;
      } else if (a.sort > b.sort) {
        return 1;
      } else {
        return 0;
      }
    }) || []
  );
}

export async function refreshIndexPattern(
  indexPattern: IndexPatternTableItem,
  indexPatterns: IndexPatternTableItem[],
  indexPatternManagementStart: IndexPatternManagementStart,
  indexPatternsService: IndexPatternsContract
) {
  const newIndexPattern = await getIndexPattern(
    indexPattern.id,
    indexPattern.default,
    indexPatternManagementStart,
    indexPatternsService,
    { forceRefresh: true }
  );
  const newIndexPatterns = [...indexPatterns];
  const index = newIndexPatterns.findIndex(({ id }) => id === indexPattern.id);
  newIndexPatterns[index] = newIndexPattern;
  return newIndexPatterns;
}

async function getIndexPattern(
  id: string,
  isDefault: boolean,
  indexPatternManagementStart: IndexPatternManagementStart,
  indexPatternsService: IndexPatternsContract,
  options?: { forceRefresh?: boolean }
): Promise<IndexPatternTableItem> {
  const pattern = await indexPatternsService.get(id, options);
  const tags = (indexPatternManagementStart as IndexPatternManagementStart).list.getIndexPatternTags(
    pattern,
    isDefault
  );

  return {
    id,
    title: pattern.title,
    default: isDefault,
    tags,
    namespaces: pattern.namespaces,
    // the prepending of 0 at the default pattern takes care of prioritization
    // so the sorting will but the default index on top
    // or on bottom of a the table
    sort: `${isDefault ? '0' : '1'}${pattern.title}`,
  };
}
