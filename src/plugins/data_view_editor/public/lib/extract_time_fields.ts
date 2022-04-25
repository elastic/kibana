/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IndexPatternField } from '@kbn/data-plugin/public';
import { TimestampOption } from '../types';

export function extractTimeFields(
  fields: IndexPatternField[],
  requireTimestampField: boolean = false
): TimestampOption[] {
  const dateFields = fields.filter((field) => field.type === 'date');

  if (dateFields.length === 0) {
    return [];
  }

  const noTimeFieldLabel = i18n.translate(
    'indexPatternEditor.createIndexPattern.stepTime.noTimeFieldOptionLabel',
    {
      defaultMessage: "--- I don't want to use the time filter ---",
    }
  );
  const noTimeFieldOption = {
    display: noTimeFieldLabel,
    fieldName: '',
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
