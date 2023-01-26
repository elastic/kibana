/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { fieldCalculator } from './field_calculator';
import { DataTableRecord } from '../../../../../types';
import { ErrorFieldDetails, FieldDetails, ValidFieldDetails } from './types';

export const isValidFieldDetails = (details: FieldDetails): details is ValidFieldDetails =>
  !(details as ErrorFieldDetails).error;

export function getDetails(
  field: DataViewField,
  hits: DataTableRecord[] | undefined,
  dataView: DataView
) {
  if (!hits) {
    return undefined;
  }

  return fieldCalculator.getFieldValueCounts({
    hits,
    field,
    count: 5,
    grouped: false,
    dataView,
  });
}
