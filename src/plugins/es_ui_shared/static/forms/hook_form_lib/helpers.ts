/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FieldHook } from './types';

export const getFieldValidityAndErrorMessage = (field: {
  isChangingValue: FieldHook['isChangingValue'];
  errors: FieldHook['errors'];
}): { isInvalid: boolean; errorMessage: string | null } => {
  const isInvalid = !field.isChangingValue && field.errors.length > 0;
  const errorMessage =
    !field.isChangingValue && field.errors.length ? field.errors[0].message : null;

  return { isInvalid, errorMessage };
};
