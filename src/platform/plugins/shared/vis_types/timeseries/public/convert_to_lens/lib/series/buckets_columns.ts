/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { Panel } from '../../../../common/types';
import { getFieldsForTerms } from '../../../../common/fields_utils';
import {
  Column,
  convertToFiltersColumn,
  convertToDateHistogramColumn,
  convertToTermsColumn,
  TermsSeries,
  FiltersSeries,
  DateHistogramSeries,
} from '../convert';
import { getValidColumns } from './columns';

export const isSplitWithDateHistogram = (
  series: TermsSeries,
  splitFields: string[],
  dataView: DataView
) => {
  if (series.terms_field && series.split_mode === 'terms' && splitFields.length) {
    for (const f of splitFields) {
      const fieldType = dataView.getFieldByName(f)?.type;

      if (fieldType === 'date') {
        if (splitFields.length === 1) {
          return true;
        } else {
          // not supported terms with several field if one of them has date type
          return null;
        }
      }
    }
  }
  return false;
};

const isFiltersSeries = (
  series: DateHistogramSeries | TermsSeries | FiltersSeries
): series is FiltersSeries => {
  return series.split_mode === 'filters' || series.split_mode === 'filter';
};

const isTermsSeries = (
  series: DateHistogramSeries | TermsSeries | FiltersSeries
): series is TermsSeries => {
  return series.split_mode === 'terms';
};

const isDateHistogramSeries = (
  series: DateHistogramSeries | TermsSeries | FiltersSeries,
  isDateHistogram: boolean
): series is DateHistogramSeries => {
  return isDateHistogram && series.split_mode === 'terms';
};

export const getBucketsColumns = (
  model: Panel | undefined,
  series: DateHistogramSeries | TermsSeries | FiltersSeries,
  columns: Column[],
  dataView: DataView,
  isSplit: boolean = false,
  label?: string,
  includeEmptyRowsForDateHistogram: boolean = true
) => {
  if (isFiltersSeries(series)) {
    const filterColumn = convertToFiltersColumn(series, true);
    return getValidColumns([filterColumn]);
  }
  if (isTermsSeries(series)) {
    const splitFields = getFieldsForTerms(series.terms_field);
    const isDateHistogram = isSplitWithDateHistogram(series, splitFields, dataView);
    if (isDateHistogram === null) {
      return null;
    }
    if (isDateHistogramSeries(series, isDateHistogram)) {
      const dateHistogramColumn = convertToDateHistogramColumn(model, series, dataView, {
        fieldName: splitFields[0],
        isSplit: true,
        includeEmptyRows: includeEmptyRowsForDateHistogram,
      });
      return getValidColumns(dateHistogramColumn);
    }

    if (!splitFields.length) {
      return null;
    }

    const termsColumn = convertToTermsColumn(
      splitFields as [string, ...string[]],
      series,
      columns,
      dataView,
      isSplit,
      label
    );
    return getValidColumns(termsColumn);
  }
  return [];
};
