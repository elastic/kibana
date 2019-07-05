/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useState, useEffect, useRef } from 'react';

import {
  Form,
  Field,
  FieldConfig,
  FieldValidateResponse,
  ValidationConfig,
  ValidationError,
} from '../types';
import { toInt } from '../field_formatters';
import { FIELD_TYPES, VALIDATION_TYPES } from '../constants';

/**
 * Helpers to decide which message to output from a validation.
 *
 * A default message can be declared on our validators, but this message can be overriden
 * in the configuration of the field "validations".
 * A message can _also_ be a function that receives the error being thrown.
 *
 * @param validation The validation being executed
 * @param validationResult The validation result
 */
const getValidationErrorWithMessage = (
  validation: Partial<ValidationConfig>,
  validationResult: ValidationError
) => {
  const message =
    typeof validation.message !== 'undefined' ? validation.message : validationResult.message;

  return {
    ...validationResult,
    message: typeof message === 'function' ? message(validationResult) : message,
  };
};

export const useField = (form: Form, path: string, config: FieldConfig = {}) => {
  const {
    defaultValue = '',
    label = '',
    helpText = '',
    type = FIELD_TYPES.TEXT,
    validations = [],
    formatters = [],
    fieldsToValidateOnChange = [path],
    isValidationAsync = false,
    errorDisplayDelay = form.options.errorDisplayDelay,
  } = config;

  const { outputSerializer } = config;

  const [value, setStateValue] = useState(
    typeof defaultValue === 'function' ? defaultValue() : defaultValue
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPristine, setPristine] = useState(true);
  const [isValidating, setValidating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const validateCounter = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const setDefaultFormatter = () => {
    if (formatters.length > 0) {
      return;
    }

    if (type === FIELD_TYPES.NUMBER) {
      formatters.push(toInt);
    }
  };

  // -- INIT
  // ----------------------------------
  setDefaultFormatter();

  // -- HELPERS
  // ----------------------------------

  /**
   * Filter an array of errors with specific validation type on them
   *
   * @param _errors The array of errors to filter
   * @param validationType The validation type to filter out
   */
  const filterErrors = (
    _errors: ValidationError[],
    validationType: string | string[] = VALIDATION_TYPES.FIELD
  ): ValidationError[] => {
    const validationTypeToArray = Array.isArray(validationType)
      ? (validationType as string[])
      : ([validationType] as string[]);

    const doWeFilterOutFieldValidationType = validationTypeToArray.some(
      _type => _type === VALIDATION_TYPES.FIELD
    );

    return _errors.filter(error => {
      const doesNotHaveValidationTypeDefined =
        {}.hasOwnProperty.call(error, 'validationType') === false;

      // If no validation type set for the error (the default type is "field")
      // we filter out the error _if_ we are filtering out field errors
      if (doesNotHaveValidationTypeDefined) {
        return !doWeFilterOutFieldValidationType;
      }

      return validationTypeToArray.every(_type => error.validationType !== _type);
    });
  };

  const runFormatters = (input: unknown): unknown => {
    const isEmptyString = typeof input === 'string' && input.trim() === '';

    if (isEmptyString) {
      return input;
    }
    return formatters.reduce((output, formatter) => formatter(output), input);
  };

  const onValueChange = () => {
    if (isPristine) {
      setPristine(false);
    }
    setIsUpdating(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setIsUpdating(false);
    }, errorDisplayDelay);
  };

  const validateSync = ({
    formData,
    value: valueToValidate,
  }: {
    formData: any;
    value: unknown;
  }): ValidationError[] => {
    const validationErrors: ValidationError[] = [];
    let skip = false;

    const doValidate = ({ validator, exitOnFail }: ValidationConfig) => {
      if (skip) {
        return;
      }
      let validationResult;

      try {
        validationResult = validator({
          value: (valueToValidate as unknown) as string,
          errors: validationErrors,
          formData,
          path,
        });

        if (validationResult && exitOnFail === true) {
          throw validationResult;
        }
      } catch (error) {
        // If an error is thrown, skip the rest of the validations
        skip = true;
        validationResult = error;
      }

      return validationResult;
    };

    // Execute each validations for the field sequencially
    validations.forEach(validation => {
      const validationResult = doValidate(validation);

      if (validationResult) {
        const error = getValidationErrorWithMessage(validation, validationResult);
        validationErrors.push({
          ...error,
          validationType: validation.type || VALIDATION_TYPES.FIELD,
        });
      }
    });

    return validationErrors;
  };

  const validateAsync = async ({
    formData,
    value: valueToValidate,
  }: {
    formData: any;
    value: unknown;
  }): Promise<ValidationError[]> => {
    const validationErrors: ValidationError[] = [];
    let skip = false;

    // By default, for fields that have an asynchronous validation
    // we will clear the errors as soon as the field value changes.
    clearErrors([VALIDATION_TYPES.FIELD, VALIDATION_TYPES.ASYNC]);

    const doValidate = async ({ validator, exitOnFail }: ValidationConfig) => {
      if (skip) {
        return;
      }
      let validationResult;

      try {
        validationResult = await validator({
          value: (valueToValidate as unknown) as string,
          errors: validationErrors,
          formData,
          path,
        });

        if (validationResult && exitOnFail === true) {
          throw validationResult;
        }
      } catch (error) {
        // If an error is thrown, skip the rest of the validations
        skip = true;
        validationResult = error;
      }

      return validationResult;
    };

    // Sequencially execute all the validations for the field
    await validations.reduce(
      (promise, validation) =>
        promise.then(async () => {
          const validationResult = await doValidate(validation);

          if (validationResult) {
            const error = getValidationErrorWithMessage(validation, validationResult);
            validationErrors.push({
              ...error,
              validationType: validation.type || VALIDATION_TYPES.FIELD,
            });
          }
        }),
      Promise.resolve()
    );

    return validationErrors;
  };

  // -- API
  // ----------------------------------
  const clearErrors: Field['clearErrors'] = (validationType = VALIDATION_TYPES.FIELD) => {
    setErrors(previousErrors => filterErrors(previousErrors, validationType));
  };

  const validate: Field['validate'] = (validationData = {}) => {
    let { formData, value: valueToValidate } = validationData;
    formData = formData || form.getFormData({ unflatten: false });
    valueToValidate = valueToValidate || value;

    setValidating(true);

    // By the time our validate function has reached completion, it’s possible
    // that validate() will have been called again. If this is the case, we need
    // to ignore the results of this invocation and only use the results of
    // the most recent invocation to update the error state for a field
    const validateIteration = ++validateCounter.current;

    const onValidationResult = (validationErrors: ValidationError[]): FieldValidateResponse => {
      if (validateIteration === validateCounter.current) {
        // This is the most recent invocation
        setValidating(false);
        setErrors(previousErrors => {
          // We first filter out the "field" errors
          // Other custom type of error will have to be manually cleared out from inside the application
          const filteredErrors = filterErrors(previousErrors);
          return [...filteredErrors, ...validationErrors];
        });
      }
      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      };
    };

    if (isValidationAsync) {
      return validateAsync({ formData, value: valueToValidate }).then(onValidationResult);
    } else {
      const validationErrors = validateSync({ formData, value: valueToValidate });
      return onValidationResult(validationErrors);
    }
  };

  /**
   * Handler to change the field value
   *
   * @param newValue The new value to assign to the field
   */
  const setValue: Field['setValue'] = newValue => {
    onValueChange();
    setStateValue(runFormatters(newValue));
  };

  /**
   * Form <input /> "onChange" event handler
   *
   * @param event Form input change event
   */
  const onChange: Field['onChange'] = event => {
    const newValue = {}.hasOwnProperty.call(event!.target, 'checked')
      ? event.target.checked
      : event.target.value;

    setValue(newValue);
  };

  const getOutputValue: Field['getOutputValue'] = () =>
    outputSerializer ? outputSerializer(value) : value;

  /**
   * As we can have multiple validation types (FIELD, ASYNC, ARRAY_ITEM), this
   * method allows us to retrieve error messages for certain types of validation.
   *
   * For example, if we want to validation error messages to be displayed when the user clicks the "save" button
   * _but_ in caase of an asynchronous validation (for ex. an HTTP request that would validate an index name) we
   * want to immediately display the error message, we would have 2 types of validation: FIELD & ASYNC
   *
   * @param validationType The validation type to return error messages from
   */
  const getErrorsMessages: Field['getErrorsMessages'] = (
    validationType = VALIDATION_TYPES.FIELD
  ) => {
    const errorMessages = errors.reduce((messages, error) => {
      if (
        error.validationType === validationType ||
        (validationType === VALIDATION_TYPES.FIELD && !{}.hasOwnProperty.call(error, 'type'))
      ) {
        return messages ? `${messages}, ${error.message}` : (error.message as string);
      }
      return messages;
    }, '');

    return errorMessages ? errorMessages : null;
  };

  // -- EFFECTS
  // ----------------------------------
  useEffect(() => {
    if (isPristine) {
      // Avoid validate on mount
      return;
    }
    form.validateFields(fieldsToValidateOnChange);
  }, [value]);

  const field: Field = {
    path,
    label,
    helpText,
    value,
    errors,
    type,
    form,
    isPristine,
    isValidating,
    isUpdating,
    validate,
    setErrors,
    clearErrors,
    setValue,
    onChange,
    getOutputValue,
    getErrorsMessages,
  };

  form.addField(field);

  return field;
};
