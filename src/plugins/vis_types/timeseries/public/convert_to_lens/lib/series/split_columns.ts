/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { Series, Panel } from '../../../../common/types';
import { getFieldsForTerms } from '../../../../common/fields_utils';
import {
  Column,
  convertToFiltersColumn,
  convertToDateHistogramColumn,
  converToTermsColumns,
} from '../convert';
import { getValidColumns } from './columns';

export const isSplitWithDateHistogram = (
  series: Series,
  splitFields: string[],
  dataView: DataView
) => {
  let splitWithDateHistogram = false;
  if (series.terms_field && series.split_mode === 'terms' && splitFields) {
    for (const f of splitFields) {
      const fieldType = dataView.getFieldByName(f)?.type;

      if (fieldType === 'date') {
        if (splitFields.length === 1) {
          splitWithDateHistogram = true;
        } else {
          // not supported terms with several field if one of them has date type
          return null;
        }
      }
    }
  }
  return splitWithDateHistogram;
};

export const getSplitColumns = (
  model: Panel,
  series: Series,
  columns: Column[],
  dataView: DataView
) => {
  if (series.split_mode === 'filters' || series.split_mode === 'filter') {
    const filterColumn = convertToFiltersColumn(series, true);
    if (!filterColumn) {
      return null;
    }
    return [filterColumn];
  }
  if (series.split_mode === 'terms') {
    const splitFields = getFieldsForTerms(series.terms_field);
    const isDateHistogram = isSplitWithDateHistogram(series, splitFields, dataView);
    if (isDateHistogram === null) {
      return null;
    }
    if (isDateHistogram) {
      const dateHistogramColumn = convertToDateHistogramColumn(
        model,
        series,
        dataView,
        splitFields[0],
        true
      );
      if (!dateHistogramColumn) {
        return null;
      }
      return [dateHistogramColumn];
    }

    const termsColumns = converToTermsColumns(splitFields, series, columns, dataView);
    return getValidColumns(termsColumns);
  }
  return [];
};
