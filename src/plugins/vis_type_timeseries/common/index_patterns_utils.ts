/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type { Panel, IndexPatternValue, FetchedIndexPattern } from '../common/types';
import { IIndexPattern, IndexPatternsService } from '../../data/common';

export const isStringTypeIndexPattern = (
  indexPatternValue: IndexPatternValue
): indexPatternValue is string => typeof indexPatternValue === 'string';

export const getIndexPatternKey = (indexPatternValue: IndexPatternValue) =>
  isStringTypeIndexPattern(indexPatternValue) ? indexPatternValue : indexPatternValue?.id ?? '';

export const extractIndexPatternValues = (panel: Panel, defaultIndex: IIndexPattern | null) => {
  const patterns: IndexPatternValue[] = [];

  if (panel.index_pattern) {
    patterns.push(panel.index_pattern);
  }

  panel.series.forEach((series) => {
    const indexPattern = series.series_index_pattern;
    if (indexPattern && series.override_index_pattern) {
      patterns.push(indexPattern);
    }
  });

  if (panel.annotations) {
    panel.annotations.forEach((item) => {
      const indexPattern = item.index_pattern;
      if (indexPattern) {
        patterns.push(indexPattern);
      }
    });
  }

  if (patterns.length === 0 && defaultIndex?.id) {
    patterns.push({ id: defaultIndex.id });
  }

  return uniq<IndexPatternValue>(patterns).sort();
};

export const fetchIndexPattern = async (
  indexPatternValue: IndexPatternValue | undefined,
  indexPatternsService: Pick<IndexPatternsService, 'getDefault' | 'get' | 'find'>,
  options: {
    fetchKibanaIndexForStringIndexes: boolean;
  } = {
    fetchKibanaIndexForStringIndexes: false,
  }
): Promise<FetchedIndexPattern> => {
  let indexPattern: FetchedIndexPattern['indexPattern'];
  let indexPatternString: string = '';

  if (!indexPatternValue) {
    indexPattern = await indexPatternsService.getDefault();
  } else {
    if (isStringTypeIndexPattern(indexPatternValue)) {
      if (options.fetchKibanaIndexForStringIndexes) {
        indexPattern = (await indexPatternsService.find(indexPatternValue)).find(
          (index) => index.title === indexPatternValue
        );
      }
      if (!indexPattern) {
        indexPatternString = indexPatternValue;
      }

      indexPatternString = indexPatternValue;
    } else if (indexPatternValue.id) {
      indexPattern = await indexPatternsService.get(indexPatternValue.id);
    }
  }

  return {
    indexPattern,
    indexPatternString: indexPattern?.title ?? indexPatternString,
  };
};
