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
import { AdHocDataViewsService } from './adhoc_data_views_service';

export const extractOrGenerateDatasourceInfo = async (
  currentIndexPattern: IndexPatternValue,
  currentTimeField: string | undefined,
  isOverwritten: boolean,
  overwrittenIndexPattern: IndexPatternValue | undefined,
  overwrittenTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart,
  adHocDataViewsService: AdHocDataViewsService
) => {
  try {
    let indexPatternId =
      currentIndexPattern && !isStringTypeIndexPattern(currentIndexPattern)
        ? currentIndexPattern.id
        : '';

    let timeField = currentTimeField;
    let indexPattern: DataView | null | undefined;
    // handle override index pattern
    if (isOverwritten) {
      if (isStringTypeIndexPattern(overwrittenIndexPattern)) {
        indexPattern = await adHocDataViewsService.create({
          title: overwrittenIndexPattern,
          timeFieldName: overwrittenTimeField,
        });
        indexPatternId = indexPattern.id ?? '';
        timeField = indexPattern.timeFieldName;
      } else {
        const fetchedIndexPattern = await fetchIndexPattern(overwrittenIndexPattern, dataViews);
        indexPattern = fetchedIndexPattern.indexPattern;
        if (indexPattern) {
          indexPatternId = indexPattern.id ?? '';
          timeField = overwrittenTimeField ?? indexPattern.timeFieldName;
        }
      }
    }

    if (!indexPatternId) {
      if (isStringTypeIndexPattern(currentIndexPattern)) {
        indexPattern = await adHocDataViewsService.create({
          title: currentIndexPattern,
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
    adHocDataViewsService.clearAll();
    return null;
  }
};
