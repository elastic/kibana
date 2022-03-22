/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type { Panel, IndexPatternValue, FetchedIndexPattern } from '../common/types';
import { DataViewsService } from '../../../data_views/common';

export const isStringTypeIndexPattern = (
  indexPatternValue: IndexPatternValue
): indexPatternValue is string => typeof indexPatternValue === 'string';

export const getIndexPatternKey = (indexPatternValue: IndexPatternValue) =>
  isStringTypeIndexPattern(indexPatternValue) ? indexPatternValue : indexPatternValue?.id ?? '';

export const extractIndexPatternValues = (panel: Panel, defaultIndexId?: string) => {
  const patterns: IndexPatternValue[] = [];

  const addIndex = (value?: IndexPatternValue) => {
    if (value) {
      patterns.push(value);
    } else if (defaultIndexId) {
      patterns.push({ id: defaultIndexId });
    }
  };

  addIndex(panel.index_pattern);

  panel.series.forEach((series) => {
    if (series.override_index_pattern) {
      addIndex(series.series_index_pattern);
    }
  });

  if (panel.annotations) {
    panel.annotations.forEach((item) => addIndex(item.index_pattern));
  }

  return uniq<IndexPatternValue>(patterns).sort();
};

export const fetchIndexPattern = async (
  indexPatternValue: IndexPatternValue | undefined,
  indexPatternsService: Pick<DataViewsService, 'getDefault' | 'get' | 'find'>,
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
