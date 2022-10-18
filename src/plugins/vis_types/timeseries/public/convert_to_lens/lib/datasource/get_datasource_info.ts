/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  fetchIndexPattern,
  isStringTypeIndexPattern,
} from '../../../../common/index_patterns_utils';
import type { IndexPatternValue } from '../../../../common/types';

export const getDataSourceInfo = async (
  modelIndexPattern: IndexPatternValue,
  modelTimeField: string | undefined,
  isOverwritten: boolean,
  overwrittenIndexPattern: IndexPatternValue | undefined,
  seriesTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart
) => {
  try {
    let indexPatternId =
      modelIndexPattern && !isStringTypeIndexPattern(modelIndexPattern) ? modelIndexPattern.id : '';

    let timeField = modelTimeField;
    let indexPattern: DataView | null | undefined;
    // handle override index pattern
    if (isOverwritten) {
      const fetchedIndexPattern = await fetchIndexPattern(overwrittenIndexPattern, dataViews);
      indexPattern = fetchedIndexPattern.indexPattern;

      if (indexPattern) {
        indexPatternId = indexPattern.id ?? '';
        timeField = seriesTimeField ?? indexPattern.timeFieldName;
      }
    }

    if (!indexPatternId) {
      if (isStringTypeIndexPattern(modelIndexPattern)) {
        indexPattern = await dataViews.create({
          title: modelIndexPattern,
          timeFieldName: timeField,
        });
        indexPatternId = indexPattern.id ?? '';
      } else {
        indexPattern = await dataViews.getDefault();
        indexPatternId = indexPattern?.id ?? '';
        timeField = indexPattern?.timeFieldName;
      }
    } else {
      indexPattern = await dataViews.get(indexPatternId);
      if (!timeField) {
        timeField = indexPattern.timeFieldName;
      }
    }

    return {
      indexPatternId,
      timeField,
      indexPattern,
    };
  } catch (e) {
    return null;
  }
};
