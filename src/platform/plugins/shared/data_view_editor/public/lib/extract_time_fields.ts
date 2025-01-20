/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { TimestampOption } from '../types';

export const noTimeFieldLabel = i18n.translate(
  'indexPatternEditor.createIndexPattern.stepTime.noTimeFieldOptionLabel',
  {
    defaultMessage: "--- I don't want to use the time filter ---",
  }
);
export const noTimeFieldValue = '';

export function extractTimeFields(
  fields: DataViewField[],
  requireTimestampField: boolean = false
): TimestampOption[] {
  const dateFields = fields.filter((field) => field.type === 'date');

  if (dateFields.length === 0) {
    return [];
  }

  const noTimeFieldOption = {
    display: noTimeFieldLabel,
    fieldName: noTimeFieldValue,
  };

  const timeFields = dateFields.map((field) => ({
    display: field.name,
    fieldName: field.name,
  }));

  if (!requireTimestampField) {
    timeFields.push(noTimeFieldOption);
  }

  return timeFields;
}
