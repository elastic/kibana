/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { InvokeCreator } from 'xstate';
import { IntegrationError } from '../../types';

export class FormattingError extends IntegrationError {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type Validator = (field: string) => IntegrationError | null;

interface ValidatorsConfig {
  [key: string]: Validator[] | ((arrayField: unknown[]) => IndexedValidationErrors | null);
}

export interface ValidationErrors {
  [key: string]: ValidationResult;
}

export interface IndexedValidationErrors {
  [key: number]: {
    [key: string]: IntegrationError[];
  };
}

type ValidationResult = IntegrationError[] | IndexedValidationErrors;

export const initializeValidateFields =
  (validatorsConfig: ValidatorsConfig): InvokeCreator<any, any> =>
  (context) => {
    const errors = validateConfigsAgainstContext(validatorsConfig, context.fields);
    if (Object.keys(errors).length > 0) {
      return Promise.reject({ errors });
    } else {
      return Promise.resolve();
    }
  };

export const createIsEmptyValidation = (message: string) => (field: unknown) =>
  isEmpty(field) ? new FormattingError(message) : null;

export const createIsLowerCaseValidation = (message: string) => (field: string) =>
  field.toLowerCase() !== field ? new FormattingError(message) : null;

export const createCharacterLimitValidation = (message: string, limit: number) => (field: string) =>
  field.length > limit ? new FormattingError(message) : null;

export const createArrayValidator = (validatorsConfig: ValidatorsConfig) => {
  return (arrayField: any[]) => {
    const arrayErrors = arrayField.reduce<IndexedValidationErrors>(
      (indexedErrors, item, currentIndex) => {
        const errorsForField = validateConfigsAgainstContext(validatorsConfig, item);
        return {
          ...indexedErrors,
          ...(Object.keys(errorsForField).length > 0 ? { [currentIndex]: errorsForField } : {}),
        } as IndexedValidationErrors;
      },
      {}
    );

    return Object.keys(arrayErrors).length > 0 ? arrayErrors : null;
  };
};

const validateConfigsAgainstContext = (validatorsConfig: ValidatorsConfig, context: any) => {
  const errors = Object.entries(validatorsConfig).reduce<ValidationErrors>(
    (validationErrors, validationConfig) => {
      const [field, validatorsOrIndexedValidator] = validationConfig;
      let errorsForField;
      if (Array.isArray(validatorsOrIndexedValidator)) {
        errorsForField = validatorsOrIndexedValidator
          .map((validator) => validator(context[field]))
          .filter((result): result is IntegrationError => result !== null);
      } else {
        errorsForField = validatorsOrIndexedValidator(context[field]);
      }

      return {
        ...validationErrors,
        ...((Array.isArray(errorsForField) && errorsForField.length > 0) ||
        (!Array.isArray(errorsForField) && errorsForField !== null)
          ? { [field]: errorsForField }
          : {}),
      };
    },
    {}
  );
  return errors;
};
