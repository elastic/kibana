/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dateMath from '@elastic/datemath';
import { DataViewFieldBase } from '@kbn/es-query';
import { checkEmptyValue } from '../check_empty_value';

import * as i18n from '../translations';

/**
 * Very basic validation for values
 * @param param the value being checked
 * @param field the selected field
 * @param isRequired whether or not an empty value is allowed
 * @param touched has field been touched by user
 * @returns undefined if valid, string with error message if invalid
 */
export const paramIsValid = (
  param: string | undefined,
  field: DataViewFieldBase | undefined,
  isRequired: boolean,
  touched: boolean
): string | undefined => {
  if (field == null) {
    return undefined;
  }

  const emptyValueError = checkEmptyValue(param, field, isRequired, touched);
  if (emptyValueError !== null) {
    return emptyValueError;
  }

  switch (field.type) {
    case 'date':
      const moment = dateMath.parse(param ?? '');
      const isDate = Boolean(moment && moment.isValid());
      return isDate ? undefined : i18n.DATE_ERR;
    case 'number':
      const isNum = param != null && param.trim() !== '' && !isNaN(+param);
      return isNum ? undefined : i18n.NUMBER_ERR;
    default:
      return undefined;
  }
};
