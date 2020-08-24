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

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

import { FormHook, FieldHook, FieldConfig, FieldValidateResponse, ValidationError } from '../types';
import { FIELD_TYPES, VALIDATION_TYPES } from '../constants';

export const useField = <T>(
  form: FormHook,
  path: string,
  config: FieldConfig<any, T> & { initialValue?: T } = {},
  valueChangeListener?: (value: T) => void
) => {
  const {
    type = FIELD_TYPES.TEXT,
    defaultValue = '', // The value to use a fallback mecanism when no initial value is passed
    initialValue = config.defaultValue ?? '', // The value explicitly passed
    label = '',
    labelAppend = '',
    helpText = '',
    validations,
    formatters,
    fieldsToValidateOnChange,
    errorDisplayDelay = form.__options.errorDisplayDelay,
    serializer,
    deserializer,
  } = config;

  const {
    getFormData,
    getFields,
    __addField,
    __removeField,
    __updateFormDataAt,
    __validateFields,
  } = form;

  const deserializeValue = useCallback(
    (rawValue = initialValue) => {
      if (typeof rawValue === 'function') {
        return deserializer ? deserializer(rawValue()) : rawValue();
      }
      return deserializer ? deserializer(rawValue) : rawValue;
    },
    [initialValue, deserializer]
  );

  const [value, setStateValue] = useState<T>(deserializeValue);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPristine, setPristine] = useState(true);
  const [isValidating, setValidating] = useState(false);
  const [isChangingValue, setIsChangingValue] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  const validateCounter = useRef(0);
  const changeCounter = useRef(0);
  const inflightValidation = useRef<Promise<any> | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef<boolean>(false);

  // -- HELPERS
  // ----------------------------------
  const serializeValue: FieldHook<T>['__serializeValue'] = useCallback(
    (rawValue = value) => {
      return serializer ? serializer(rawValue) : rawValue;
    },
    [serializer, value]
  );

  /**
   * Filter an array of errors with specific validation type on them
   *
   * @param _errors The array of errors to filter
   * @param validationType The validation type to filter out
   */
  const filterErrors = (
    _errors: ValidationError[],
    validationTypeToFilterOut: string | string[] = VALIDATION_TYPES.FIELD
  ): ValidationError[] => {
    const validationTypeToArray = Array.isArray(validationTypeToFilterOut)
      ? (validationTypeToFilterOut as string[])
      : ([validationTypeToFilterOut] as string[]);

    return _errors.filter((error) =>
      validationTypeToArray.every((_type) => error.validationType !== _type)
    );
  };

  const formatInputValue = useCallback(
    <T>(inputValue: unknown): T => {
      const isEmptyString = typeof inputValue === 'string' && inputValue.trim() === '';

      if (isEmptyString || !formatters) {
        return inputValue as T;
      }

      const formData = getFormData({ unflatten: false });

      return formatters.reduce((output, formatter) => formatter(output, formData), inputValue) as T;
    },
    [formatters, getFormData]
  );

  const onValueChange = useCallback(async () => {
    const changeIteration = ++changeCounter.current;
    const startTime = Date.now();

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    setPristine(false);

    if (errorDisplayDelay > 0) {
      setIsChangingValue(true);
    }

    // Notify listener
    if (valueChangeListener) {
      valueChangeListener(value);
    }

    // Update the form data observable
    __updateFormDataAt(path, value);

    // Validate field(s) (that will update form.isValid state)
    // We only validate if the value is different than the initial or default value
    // to avoid validating after a form.reset() call.
    if (value !== initialValue && value !== defaultValue) {
      await __validateFields(fieldsToValidateOnChange ?? [path]);
    }

    if (isMounted.current === false) {
      return;
    }

    /**
     * If we have set a delay to display the error message after the field value has changed,
     * we first check that this is the last "change iteration" (=== the last keystroke from the user)
     * and then, we verify how long we've already waited for as form.__validateFields() is asynchronous
     * and might already have taken more than the specified delay)
     */
    if (errorDisplayDelay > 0 && changeIteration === changeCounter.current) {
      const delta = Date.now() - startTime;
      if (delta < errorDisplayDelay) {
        debounceTimeout.current = setTimeout(() => {
          debounceTimeout.current = null;
          setIsChangingValue(false);
        }, errorDisplayDelay - delta);
      } else {
        setIsChangingValue(false);
      }
    }
  }, [
    path,
    value,
    defaultValue,
    initialValue,
    valueChangeListener,
    errorDisplayDelay,
    fieldsToValidateOnChange,
    __updateFormDataAt,
    __validateFields,
  ]);

  const cancelInflightValidation = useCallback(() => {
    // Cancel any inflight validation (like an HTTP Request)
    if (
      inflightValidation.current &&
      typeof (inflightValidation.current as any).cancel === 'function'
    ) {
      (inflightValidation.current as any).cancel();
      inflightValidation.current = null;
    }
  }, []);

  const clearErrors: FieldHook['clearErrors'] = useCallback(
    (validationType = VALIDATION_TYPES.FIELD) => {
      setErrors((previousErrors) => filterErrors(previousErrors, validationType));
    },
    []
  );

  const runValidations = useCallback(
    ({
      formData,
      value: valueToValidate,
      validationTypeToValidate,
    }: {
      formData: any;
      value: unknown;
      validationTypeToValidate?: string;
    }): ValidationError[] | Promise<ValidationError[]> => {
      if (!validations) {
        return [];
      }

      // By default, for fields that have an asynchronous validation
      // we will clear the errors as soon as the field value changes.
      clearErrors([VALIDATION_TYPES.FIELD, VALIDATION_TYPES.ASYNC]);

      cancelInflightValidation();

      const runAsync = async () => {
        const validationErrors: ValidationError[] = [];

        for (const validation of validations) {
          inflightValidation.current = null;

          const {
            validator,
            exitOnFail = true,
            type: validationType = VALIDATION_TYPES.FIELD,
          } = validation;

          if (
            typeof validationTypeToValidate !== 'undefined' &&
            validationType !== validationTypeToValidate
          ) {
            continue;
          }

          inflightValidation.current = validator({
            value: (valueToValidate as unknown) as string,
            errors: validationErrors,
            form: { getFormData, getFields },
            formData,
            path,
          }) as Promise<ValidationError>;

          const validationResult = await inflightValidation.current;

          if (!validationResult) {
            continue;
          }

          validationErrors.push({
            ...validationResult,
            validationType: validationType || VALIDATION_TYPES.FIELD,
          });

          if (exitOnFail) {
            break;
          }
        }

        return validationErrors;
      };

      const runSync = () => {
        const validationErrors: ValidationError[] = [];
        // Sequentially execute all the validations for the field
        for (const validation of validations) {
          const {
            validator,
            exitOnFail = true,
            type: validationType = VALIDATION_TYPES.FIELD,
          } = validation;

          if (
            typeof validationTypeToValidate !== 'undefined' &&
            validationType !== validationTypeToValidate
          ) {
            continue;
          }

          const validationResult = validator({
            value: (valueToValidate as unknown) as string,
            errors: validationErrors,
            form: { getFormData, getFields },
            formData,
            path,
          });

          if (!validationResult) {
            continue;
          }

          if (!!validationResult.then) {
            // The validator returned a Promise: abort and run the validations asynchronously
            // We keep a reference to the onflith promise so we can cancel it.

            inflightValidation.current = validationResult as Promise<ValidationError>;
            cancelInflightValidation();

            return runAsync();
          }

          validationErrors.push({
            ...(validationResult as ValidationError),
            validationType: validationType || VALIDATION_TYPES.FIELD,
          });

          if (exitOnFail) {
            break;
          }
        }

        return validationErrors;
      };

      // We first try to run the validations synchronously
      return runSync();
    },
    [clearErrors, cancelInflightValidation, validations, getFormData, getFields, path]
  );

  // -- API
  // ----------------------------------

  /**
   * Validate a form field, running all its validations.
   * If a validationType is provided then only that validation will be executed,
   * skipping the other type of validation that might exist.
   */
  const validate: FieldHook<T>['validate'] = useCallback(
    (validationData = {}) => {
      const {
        formData = getFormData({ unflatten: false }),
        value: valueToValidate = value,
        validationType,
      } = validationData;

      setIsValidated(true);
      setValidating(true);

      // By the time our validate function has reached completion, it’s possible
      // that we have called validate() again. If this is the case, we need
      // to ignore the results of this invocation and only use the results of
      // the most recent invocation to update the error state for a field
      const validateIteration = ++validateCounter.current;

      const onValidationResult = (_validationErrors: ValidationError[]): FieldValidateResponse => {
        if (validateIteration === validateCounter.current) {
          // This is the most recent invocation
          setValidating(false);
          // Update the errors array
          setErrors((prev) => {
            const filteredErrors = filterErrors(prev, validationType);
            return [...filteredErrors, ..._validationErrors];
          });
        }

        return {
          isValid: _validationErrors.length === 0,
          errors: _validationErrors,
        };
      };

      const validationErrors = runValidations({
        formData,
        value: valueToValidate,
        validationTypeToValidate: validationType,
      });

      if (Reflect.has(validationErrors, 'then')) {
        return (validationErrors as Promise<ValidationError[]>).then(onValidationResult);
      }
      return onValidationResult(validationErrors as ValidationError[]);
    },
    [getFormData, value, runValidations]
  );

  /**
   * Handler to change the field value
   *
   * @param newValue The new value to assign to the field
   */
  const setValue: FieldHook<T>['setValue'] = useCallback(
    (newValue) => {
      const formattedValue = formatInputValue<T>(newValue);
      setStateValue(formattedValue);
      return formattedValue;
    },
    [formatInputValue]
  );

  const _setErrors: FieldHook<T>['setErrors'] = useCallback((_errors) => {
    setErrors(_errors.map((error) => ({ validationType: VALIDATION_TYPES.FIELD, ...error })));
  }, []);

  /**
   * Form <input /> "onChange" event handler
   *
   * @param event Form input change event
   */
  const onChange: FieldHook<T>['onChange'] = useCallback(
    (event) => {
      const newValue = {}.hasOwnProperty.call(event!.target, 'checked')
        ? event.target.checked
        : event.target.value;

      setValue((newValue as unknown) as T);
    },
    [setValue]
  );

  /**
   * As we can have multiple validation types (FIELD, ASYNC, ARRAY_ITEM), this
   * method allows us to retrieve error messages for certain types of validation.
   *
   * For example, if we want to validation error messages to be displayed when the user clicks the "save" button
   * _but_ in case of an asynchronous validation (for ex. an HTTP request that would validate an index name) we
   * want to immediately display the error message, we would have 2 types of validation: FIELD & ASYNC
   *
   * @param validationType The validation type to return error messages from
   */
  const getErrorsMessages: FieldHook<T>['getErrorsMessages'] = useCallback(
    (args = {}) => {
      const { errorCode, validationType = VALIDATION_TYPES.FIELD } = args;
      const errorMessages = errors.reduce((messages, error) => {
        const isSameErrorCode = errorCode && error.code === errorCode;
        const isSamevalidationType =
          error.validationType === validationType ||
          (validationType === VALIDATION_TYPES.FIELD &&
            !{}.hasOwnProperty.call(error, 'validationType'));

        if (isSameErrorCode || (typeof errorCode === 'undefined' && isSamevalidationType)) {
          return messages ? `${messages}, ${error.message}` : (error.message as string);
        }
        return messages;
      }, '');

      return errorMessages ? errorMessages : null;
    },
    [errors]
  );

  const reset: FieldHook<T>['reset'] = useCallback(
    (resetOptions = { resetValue: true }) => {
      const { resetValue = true, defaultValue: updatedDefaultValue } = resetOptions;

      setPristine(true);
      setValidating(false);
      setIsChangingValue(false);
      setIsValidated(false);
      setErrors([]);

      if (resetValue) {
        const newValue = deserializeValue(updatedDefaultValue ?? defaultValue);
        setValue(newValue);
        return newValue;
      }
    },
    [setValue, deserializeValue, defaultValue]
  );

  const isValid = errors.length === 0;

  const field = useMemo<FieldHook<T>>(() => {
    return {
      path,
      type,
      label,
      labelAppend,
      helpText,
      value,
      errors,
      isPristine,
      isValid,
      isValidating,
      isValidated,
      isChangingValue,
      onChange,
      getErrorsMessages,
      setValue,
      setErrors: _setErrors,
      clearErrors,
      validate,
      reset,
      __serializeValue: serializeValue,
    };
  }, [
    path,
    type,
    label,
    labelAppend,
    helpText,
    value,
    isPristine,
    errors,
    isValid,
    isValidating,
    isValidated,
    isChangingValue,
    onChange,
    getErrorsMessages,
    setValue,
    _setErrors,
    clearErrors,
    validate,
    reset,
    serializeValue,
  ]);

  // ----------------------------------
  // -- EFFECTS
  // ----------------------------------
  useEffect(() => {
    __addField(field as FieldHook<any>);
  }, [field, __addField]);

  useEffect(() => {
    return () => {
      __removeField(path);
    };
  }, [path, __removeField]);

  useEffect(() => {
    if (!isMounted.current) {
      return;
    }

    onValueChange();

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [onValueChange]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return field;
};
