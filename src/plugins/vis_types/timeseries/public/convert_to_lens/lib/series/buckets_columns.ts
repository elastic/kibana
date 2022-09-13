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
  convertToTermsColumn,
} from '../convert';
import { getValidColumns } from './columns';

export const isSplitWithDateHistogram = (
  series: Series,
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

export const getBucketsColumns = (
  model: Panel,
  series: Series,
  columns: Column[],
  dataView: DataView,
  isSplit: boolean = false
) => {
  if (series.split_mode === 'filters' || series.split_mode === 'filter') {
    const filterColumn = convertToFiltersColumn(series, true);
    return getValidColumns([filterColumn]);
  }
  if (series.split_mode === 'terms') {
    const splitFields = getFieldsForTerms(series.terms_field);
    const isDateHistogram = isSplitWithDateHistogram(series, splitFields, dataView);
    if (isDateHistogram === null) {
      return null;
    }
    if (isDateHistogram) {
      const dateHistogramColumn = convertToDateHistogramColumn(model, series, dataView, {
        fieldName: splitFields[0],
        isSplit: true,
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
      isSplit
    );
    return getValidColumns(termsColumn);
  }
  return [];
};
