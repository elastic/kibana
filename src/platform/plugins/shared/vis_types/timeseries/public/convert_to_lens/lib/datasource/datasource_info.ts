/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { isStringTypeIndexPattern } from '../../../../common/index_patterns_utils';
import type { IndexPatternValue } from '../../../../common/types';

const getOverwrittenIndexPattern = async (
  overwrittenIndexPattern: IndexPatternValue,
  overwrittenTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart
) => {
  if (isStringTypeIndexPattern(overwrittenIndexPattern)) {
    const indexPattern = await dataViews.create(
      {
        id: `tsvb_ad_hoc_${overwrittenIndexPattern}${
          overwrittenTimeField ? '/' + overwrittenTimeField : ''
        }`,
        title: overwrittenIndexPattern,
        timeFieldName: overwrittenTimeField,
      },
      false,
      false
    );
    const indexPatternId = indexPattern.id ?? '';
    const timeField = indexPattern.timeFieldName;
    return { indexPattern, indexPatternId, timeField };
  } else if (overwrittenIndexPattern) {
    const indexPattern = await dataViews.get(overwrittenIndexPattern.id);
    if (indexPattern) {
      const indexPatternId = indexPattern.id ?? '';
      const timeField = overwrittenTimeField ?? indexPattern.timeFieldName;
      return { indexPattern, indexPatternId, timeField };
    }
  }
  return null;
};

const getSelectedIndexPattern = async (
  selectedIndexPattern: IndexPatternValue,
  selectedTimeField: string | undefined,
  dataViews: DataViewsPublicPluginStart
) => {
  if (isStringTypeIndexPattern(selectedIndexPattern)) {
    if (!selectedTimeField) {
      throw new Error('Time field is empty');
    }
    const indexPattern = await dataViews.create(
      {
        id: `tsvb_ad_hoc_${selectedIndexPattern}${
          selectedTimeField ? '/' + selectedTimeField : ''
        }`,
        title: selectedIndexPattern,
        timeFieldName: selectedTimeField,
      },
      false,
      false
    );
    const indexPatternId = indexPattern.id ?? '';
    return { indexPattern, indexPatternId, timeField: indexPattern.timeFieldName };
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
  dataViews: DataViewsPublicPluginStart
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
        dataViews
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
        dataViews
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
    return null;
  }
};
