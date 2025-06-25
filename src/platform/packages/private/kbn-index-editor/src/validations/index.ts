/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';

export const validateCellValue = (
  value: string,
  columnType: DatatableColumnType
): string | undefined => {
  switch (columnType) {
    case 'number':
      return isNaN(Number(value))
        ? i18n.translate('indexEditor.cellValueInput.validation.number', {
            defaultMessage: 'Value must be a number',
          })
        : undefined;
    case 'boolean':
      return !['true', 'false'].includes(value.toLowerCase())
        ? i18n.translate('indexEditor.cellValueInput.validation.boolean', {
            defaultMessage: 'Value must be true or false',
          })
        : undefined;
    default:
      return undefined;
  }
};
