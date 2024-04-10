/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationStatus } from './constants';
import {
  RuleFormValidationError,
  RuleFormValidationErrorList,
  RuleFormValidationErrorObject,
  RuleFormStateValidation,
  IErrorObject,
} from '../types';

export const IncompleteError: (errorText: string) => RuleFormValidationError = (errorText) => ({
  text: errorText,
  status: ValidationStatus.INCOMPLETE,
});

export const InvalidError: (errorText: string) => RuleFormValidationError = (errorText) => ({
  text: errorText,
  status: ValidationStatus.INVALID,
});

export const getStatusFromErrorList = (
  errorList: RuleFormValidationErrorList | string[]
): ValidationStatus => {
  if (errorList.length === 0) {
    return ValidationStatus.COMPLETE;
  }

  return errorList.some(
    (error) => typeof error === 'string' || error.status === ValidationStatus.INVALID
  )
    ? ValidationStatus.INVALID
    : ValidationStatus.INCOMPLETE;
};

export const getStatusFromErrorObject = (
  errorObject: RuleFormValidationErrorObject | IErrorObject
): ValidationStatus => {
  const values: Array<
    | RuleFormValidationErrorObject[keyof RuleFormValidationErrorObject]
    | IErrorObject[keyof IErrorObject]
  > = Object.values(errorObject);
  for (const value of values) {
    const errorState =
      typeof value === 'string'
        ? ValidationStatus.INVALID
        : Array.isArray(value)
        ? getStatusFromErrorList(value)
        : getStatusFromErrorObject(value);
    if (errorState !== ValidationStatus.COMPLETE) {
      return errorState;
    }
  }
  return ValidationStatus.COMPLETE;
};

export const isValidationError = (error: unknown): error is RuleFormValidationError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    [ValidationStatus.INCOMPLETE, ValidationStatus.INVALID].includes((error as any).status)
  );
};

export const isValidationErrorList = (error: unknown): error is RuleFormValidationErrorList => {
  return Array.isArray(error) && error.every(isValidationError);
};

export const isValidationErrorObject = (error: unknown): error is RuleFormValidationErrorObject => {
  return (
    typeof error === 'object' &&
    error !== null &&
    Object.values(error).every(
      (value) => isValidationErrorList(value) || isValidationErrorObject(value)
    )
  );
};

export const flattenErrorObject = (
  errorObject: RuleFormStateValidation | RuleFormValidationErrorObject | IErrorObject
) => {
  const errors: RuleFormValidationErrorList = [];
  for (const value of Object.values(errorObject)) {
    if (isValidationErrorList(value) || Array.isArray(value)) {
      errors.push(...value.map((error) => (typeof error === 'string' ? error : error.text)));
    } else {
      errors.push(...flattenErrorObject(value));
    }
  }
  return errors;
};

export const convertValidationErrorObjectToIErrorObject = (
  errorObject: RuleFormValidationErrorObject
) => {
  const errors: IErrorObject = {};
  for (const [key, value] of Object.entries(errorObject)) {
    if (isValidationErrorList(value)) {
      errors[key] = value.map((error) => (typeof error === 'string' ? error : error.text));
    } else {
      errors[key] = convertValidationErrorObjectToIErrorObject(value);
    }
  }
  return errors;
};
