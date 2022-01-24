/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fetchIndexPattern, isStringTypeIndexPattern } from '../../common/index_patterns_utils';
import type { IndexPatternValue } from '../../common/types';
import { getDataStart } from '../services';

export const getDataSourceInfo = async (
  modelIndexPattern: IndexPatternValue,
  modelTimeField: string | undefined,
  overwrittenIndexPattern: IndexPatternValue | undefined
) => {
  const { dataViews } = getDataStart();
  let indexPatternId =
    modelIndexPattern && !isStringTypeIndexPattern(modelIndexPattern) ? modelIndexPattern.id : '';

  let timeField = modelTimeField;
  // handle override index pattern
  if (overwrittenIndexPattern) {
    const { indexPattern } = await fetchIndexPattern(overwrittenIndexPattern, dataViews);
    if (indexPattern) {
      indexPatternId = indexPattern.id ?? '';
      timeField = indexPattern.timeFieldName;
    }
  } else {
    if (!timeField) {
      if (indexPatternId) {
        const indexPattern = await dataViews.get(indexPatternId);
        timeField = indexPattern.timeFieldName;
      } else {
        const defaultIndex = await dataViews.getDefault();
        timeField = defaultIndex?.timeFieldName;
      }
    }
    if (!indexPatternId) {
      const defaultIndex = await dataViews.getDefault();
      indexPatternId = defaultIndex?.id ?? '';
    }
  }

  return {
    indexPatternId,
    timeField,
  };
};
