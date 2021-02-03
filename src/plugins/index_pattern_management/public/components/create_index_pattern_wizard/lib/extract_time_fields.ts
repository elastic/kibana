/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IFieldType } from '../../../../../../plugins/data/public';

export function extractTimeFields(fields: IFieldType[]) {
  const dateFields = fields.filter((field) => field.type === 'date');
  const label = i18n.translate(
    'indexPatternManagement.createIndexPattern.stepTime.noTimeFieldsLabel',
    {
      defaultMessage: "The indices which match this index pattern don't contain any time fields.",
    }
  );

  if (dateFields.length === 0) {
    return [
      {
        display: label,
      },
    ];
  }

  const disabledDividerOption = {
    isDisabled: true,
    display: '───',
    fieldName: '',
  };
  const noTimeFieldLabel = i18n.translate(
    'indexPatternManagement.createIndexPattern.stepTime.noTimeFieldOptionLabel',
    {
      defaultMessage: "I don't want to use the time filter",
    }
  );
  const noTimeFieldOption = {
    display: noTimeFieldLabel,
    fieldName: undefined,
  };

  return [
    ...dateFields.map((field) => ({
      display: field.name,
      fieldName: field.name,
    })),
    disabledDividerOption,
    noTimeFieldOption,
  ];
}
