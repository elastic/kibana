/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { fetchIndexPattern, isStringTypeIndexPattern } from '../../common/index_patterns_utils';
import type { IndexPatternValue } from '../../common/types';
import { getDataViewsStart } from '../services';

export const getDataSourceInfo = async (
  modelIndexPattern: IndexPatternValue,
  modelTimeField: string | undefined,
  isOverwritten: boolean,
  overwrittenIndexPattern: IndexPatternValue | undefined
) => {
  const dataViews = getDataViewsStart();
  let indexPatternId =
    modelIndexPattern && !isStringTypeIndexPattern(modelIndexPattern) ? modelIndexPattern.id : '';

  let timeField = modelTimeField;
  // handle override index pattern
  if (isOverwritten) {
    const { indexPattern } = await fetchIndexPattern(overwrittenIndexPattern, dataViews);
    if (indexPattern) {
      indexPatternId = indexPattern.id ?? '';
      timeField = indexPattern.timeFieldName;
    }
  }

  if (!indexPatternId) {
    const defaultIndex = await dataViews.getDefault();
    indexPatternId = defaultIndex?.id ?? '';
    timeField = defaultIndex?.timeFieldName;
  }
  if (!timeField) {
    const indexPattern = await dataViews.get(indexPatternId);
    timeField = indexPattern.timeFieldName;
  }

  return {
    indexPatternId,
    timeField,
  };
};
