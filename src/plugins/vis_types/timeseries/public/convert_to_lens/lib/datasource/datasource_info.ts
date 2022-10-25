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

const getIndexPattern = async (
  indexPattern: IndexPatternValue,
  dataViews: DataViewsPublicPluginStart,
  options?: { fetchKibanaIndexForStringIndexes: boolean }
) => {
  const fetchedIndexPattern = await fetchIndexPattern(indexPattern, dataViews, options);
  return fetchedIndexPattern.indexPattern;
};

const getOverwrittenIndexPattern = async (
  overwrittenIndexPattern: IndexPatternValue,
  overwrittenTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart,
  adHocDataViewsService: AdHocDataViewsService
) => {
  if (isStringTypeIndexPattern(overwrittenIndexPattern)) {
    const fetchedIndexPattern = await getIndexPattern(overwrittenIndexPattern, dataViews, {
      fetchKibanaIndexForStringIndexes: true,
    });
    if (!fetchedIndexPattern) {
      const indexPattern = await adHocDataViewsService.create({
        title: overwrittenIndexPattern,
        timeFieldName: overwrittenTimeField,
      });
      const indexPatternId = indexPattern.id ?? '';
      const timeField = indexPattern.timeFieldName;
      return { indexPattern, indexPatternId, timeField };
    }
    const indexPattern = fetchedIndexPattern;
    const indexPatternId = indexPattern.id ?? '';
    const timeField = overwrittenTimeField ?? indexPattern.timeFieldName;
    return { indexPattern, indexPatternId, timeField };
  }
  const indexPattern = await getIndexPattern(overwrittenIndexPattern, dataViews);
  if (indexPattern) {
    const indexPatternId = indexPattern.id ?? '';
    const timeField = overwrittenTimeField ?? indexPattern.timeFieldName;
    return { indexPattern, indexPatternId, timeField };
  }
  return null;
};

const getSelectedIndexPattern = async (
  selectedIndexPattern: IndexPatternValue,
  selectedTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart,
  adHocDataViewsService: AdHocDataViewsService
) => {
  if (isStringTypeIndexPattern(selectedIndexPattern)) {
    const fetchedIndexPattern = await getIndexPattern(selectedIndexPattern, dataViews, {
      fetchKibanaIndexForStringIndexes: true,
    });
    if (!fetchedIndexPattern) {
      if (!selectedTimeField) {
        throw new Error('Time field is empty');
      }
      const indexPattern = await adHocDataViewsService.create({
        title: selectedIndexPattern,
        timeFieldName: selectedTimeField,
      });
      const indexPatternId = indexPattern.id ?? '';
      return { indexPattern, indexPatternId, timeField: selectedTimeField };
    }
    return {
      indexPattern: fetchedIndexPattern,
      indexPatternId: fetchedIndexPattern.id ?? '',
      timeField: fetchedIndexPattern.timeFieldName,
    };
  }
  const indexPattern = await dataViews.getDefault();
  const indexPatternId = indexPattern?.id ?? '';
  const timeField = indexPattern?.timeFieldName;
  return { indexPattern, indexPatternId, timeField };
};

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
      const result = await getOverwrittenIndexPattern(
        overwrittenIndexPattern,
        overwrittenTimeField,
        dataViews,
        adHocDataViewsService
      );
      if (result) {
        [indexPattern, indexPatternId, timeField] = [
          result.indexPattern,
          result.indexPatternId,
          result.timeField,
        ];
      }
    }

    if (!indexPatternId) {
      const result = await getSelectedIndexPattern(
        currentIndexPattern,
        currentTimeField,
        dataViews,
        adHocDataViewsService
      );
      [indexPattern, indexPatternId, timeField] = [
        result.indexPattern,
        result.indexPatternId,
        result.timeField,
      ];
    } else {
      indexPattern = await dataViews.get(indexPatternId);
      if (!timeField) {
        timeField = indexPattern.timeFieldName;
      }
    }

    return { indexPatternId, timeField, indexPattern };
  } catch (e) {
    adHocDataViewsService.clearAll();
    return null;
  }
};
