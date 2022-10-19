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

export const dropGeneratedAdHocDataViews = (
  generatedAdHocDataViewIds: string[],
  dataViews: DataViewsPublicPluginStart
) => {
  generatedAdHocDataViewIds.forEach((id) => dataViews.clearInstanceCache(id));
};

export const getDataSourceInfo = async (
  modelIndexPattern: IndexPatternValue,
  modelTimeField: string | undefined,
  isOverwritten: boolean,
  overwrittenIndexPattern: IndexPatternValue | undefined,
  seriesTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart
) => {
  const adHocDataViewIds = [];
  try {
    let indexPatternId =
      modelIndexPattern && !isStringTypeIndexPattern(modelIndexPattern) ? modelIndexPattern.id : '';

    let timeField = modelTimeField;
    let indexPattern: DataView | null | undefined;
    // handle override index pattern
    if (isOverwritten) {
      if (isStringTypeIndexPattern(overwrittenIndexPattern)) {
        indexPattern = await dataViews.create(
          {
            title: overwrittenIndexPattern,
            timeFieldName: seriesTimeField,
          },
          false,
          false
        );
        indexPatternId = indexPattern.id ?? '';
        timeField = indexPattern.timeFieldName;
        adHocDataViewIds.push(indexPatternId);
      } else {
        const fetchedIndexPattern = await fetchIndexPattern(overwrittenIndexPattern, dataViews);
        indexPattern = fetchedIndexPattern.indexPattern;
        if (indexPattern) {
          indexPatternId = indexPattern.id ?? '';
          timeField = seriesTimeField ?? indexPattern.timeFieldName;
        }
      }
    }

    if (!indexPatternId) {
      if (isStringTypeIndexPattern(modelIndexPattern)) {
        indexPattern = await dataViews.create(
          {
            title: modelIndexPattern,
            timeFieldName: timeField,
          },
          false,
          false
        );

        indexPatternId = indexPattern.id ?? '';
        adHocDataViewIds.push(indexPatternId);
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
      adHocDataViewIds,
    };
  } catch (e) {
    dropGeneratedAdHocDataViews(adHocDataViewIds, dataViews);
    return null;
  }
};
