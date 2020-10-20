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

import {
  FormHook,
  FieldHook,
  FieldConfig,
  FieldValidateResponse,
  ValidationError,
  FormData,
} from '../types';
import { FIELD_TYPES, VALIDATION_TYPES } from '../constants';

export interface InternalFieldConfig<T> {
  initialValue?: T;
  isIncludedInOutput?: boolean;
}

export const useField = <T, FormType = FormData, I = T>(
  form: FormHook<FormType>,
  path: string,
  config: FieldConfig<T, FormType, I> & InternalFieldConfig<T> = {},
  valueChangeListener?: (value: I) => void
) => {
  const {
    type = FIELD_TYPES.TEXT,
    defaultValue = '', // The value to use a fallback mecanism when no initial value is passed
    initialValue = config.defaultValue ?? '', // The value explicitly passed
    isIncludedInOutput = true,
    label = '',
    labelAppend = '',
    helpText = '',
    validations,
    formatters,
    fieldsToValidateOnChange,
    valueChangeDebounceTime = form.__options.valueChangeDebounceTime,
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
    __getFormData$,
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

  const [value, setStateValue] = useState<I>(deserializeValue);
  const [errors, setStateErrors] = useState<ValidationError[]>([]);
  const [isPristine, setPristine] = useState(true);
  const [isValidating, setValidating] = useState(false);
  const [isChangingValue, setIsChangingValue] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  const isMounted = useRef<boolean>(false);
  const validateCounter = useRef(0);
  const changeCounter = useRef(0);
  const hasBeenReset = useRef<boolean>(false);
  const inflightValidation = useRef<(Promise<any> & { cancel?(): void }) | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------
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
    validationTypeToFilterOut: string | string[] = VALIDATION_TYPES.FIELD
  ): ValidationError[] => {
    const validationTypeToArray = Array.isArray(validationTypeToFilterOut)
      ? (validationTypeToFilterOut as string[])
      : ([validationTypeToFilterOut] as string[]);

    return _errors.filter((error) =>
      validationTypeToArray.every((_type) => error.validationType !== _type)
    );
  };

  /**
   * If the field has some "formatters" defined in its config, run them in series and return
   * the transformed value. This handler is called whenever the field value changes, right before
   * updating the "value" state.
   */
  const formatInputValue = useCallback(
    <T>(inputValue: unknown): T => {
      const isEmptyString = typeof inputValue === 'string' && inputValue.trim() === '';

      if (isEmptyString || !formatters) {
        return inputValue as T;
      }

      const formData = __getFormData$().value;

      return formatters.reduce((output, formatter) => formatter(output, formData), inputValue) as T;
    },
    [formatters, __getFormData$]
  );

  const onValueChange = useCallback(async () => {
    const changeIteration = ++changeCounter.current;
    const startTime = Date.now();

    setPristine(false);
    setIsChangingValue(true);

    // Notify listener
    if (valueChangeListener) {
      valueChangeListener(value);
    }

    // Update the form data observable
    __updateFormDataAt(path, value);

    // Validate field(s) (this will update the form.isValid state)
    await __validateFields(fieldsToValidateOnChange ?? [path]);

    if (isMounted.current === false) {
      return;
    }

    /**
     * If we have set a delay to display the error message after the field value has changed,
     * we first check that this is the last "change iteration" (=== the last keystroke from the user)
     * and then, we verify how long we've already waited for as form.__validateFields() is asynchronous
     * and might already have taken more than the specified delay)
     */
    if (changeIteration === changeCounter.current) {
      if (valueChangeDebounceTime > 0) {
        const timeElapsed = Date.now() - startTime;

        if (timeElapsed < valueChangeDebounceTime) {
          const timeLeftToWait = valueChangeDebounceTime - timeElapsed;
          debounceTimeout.current = setTimeout(() => {
            debounceTimeout.current = null;
            setIsChangingValue(false);
          }, timeLeftToWait);
          return;
        }
      }

      setIsChangingValue(false);
    }
  }, [
    path,
    value,
    valueChangeListener,
    valueChangeDebounceTime,
    fieldsToValidateOnChange,
    __updateFormDataAt,
    __validateFields,
  ]);

  // Cancel any inflight validation (e.g an HTTP Request)
  const cancelInflightValidation = useCallback(() => {
    if (inflightValidation.current && typeof inflightValidation.current.cancel === 'function') {
      inflightValidation.current.cancel();
      inflightValidation.current = null;
    }
  }, []);

  const runValidations = useCallback(
    (
      {
        formData,
        value: valueToValidate,
        validationTypeToValidate,
      }: {
        formData: any;
        value: I;
        validationTypeToValidate?: string;
      },
      clearFieldErrors: FieldHook['clearErrors']
    ): ValidationError[] | Promise<ValidationError[]> => {
      if (!validations) {
        return [];
      }

      // By default, for fields that have an asynchronous validation
      // we will clear the errors as soon as the field value changes.
      clearFieldErrors([VALIDATION_TYPES.FIELD, VALIDATION_TYPES.ASYNC]);

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
            value: valueToValidate,
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
            // See comment below that explains why we add "__isBlocking__".
            __isBlocking__: validationResult.__isBlocking__ ?? validation.isBlocking,
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
            value: valueToValidate,
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
            // We add an "__isBlocking__" property to know if this error is a blocker or no.
            // Most validation errors are blockers but in some cases a validation is more a warning than an error
            // like with the ComboBox items when they are added.
            __isBlocking__:
              (validationResult as ValidationError).__isBlocking__ ?? validation.isBlocking,
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
    [cancelInflightValidation, validations, getFormData, getFields, path]
  );

  // ----------------------------------
  // -- Internal API
  // ----------------------------------
  const serializeValue: FieldHook<T, I>['__serializeValue'] = useCallback(
    (internalValue: I = value) => {
      return serializer ? serializer(internalValue) : ((internalValue as unknown) as T);
    },
    [serializer, value]
  );

  // ----------------------------------
  // -- Public API
  // ----------------------------------
  const clearErrors: FieldHook['clearErrors'] = useCallback(
    (validationType = VALIDATION_TYPES.FIELD) => {
      setStateErrors((previousErrors) => filterErrors(previousErrors, validationType));
    },
    []
  );

  const validate: FieldHook<T, I>['validate'] = useCallback(
    (validationData = {}) => {
      const {
        formData = __getFormData$().value,
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
          setStateErrors((prev) => {
            const filteredErrors = filterErrors(prev, validationType);
            return [...filteredErrors, ..._validationErrors];
          });
        }

        return {
          isValid: _validationErrors.length === 0,
          errors: _validationErrors,
        };
      };

      const validationErrors = runValidations(
        {
          formData,
          value: valueToValidate,
          validationTypeToValidate: validationType,
        },
        clearErrors
      );

      if (Reflect.has(validationErrors, 'then')) {
        return (validationErrors as Promise<ValidationError[]>).then(onValidationResult);
      }
      return onValidationResult(validationErrors as ValidationError[]);
    },
    [__getFormData$, value, runValidations, clearErrors]
  );

  const setValue: FieldHook<T, I>['setValue'] = useCallback(
    (newValue) => {
      setStateValue((prev) => {
        let formattedValue: I;
        if (typeof newValue === 'function') {
          formattedValue = formatInputValue<I>((newValue as Function)(prev));
        } else {
          formattedValue = formatInputValue<I>(newValue);
        }
        return formattedValue;
      });
    },
    [formatInputValue]
  );

  const setErrors: FieldHook<T, I>['setErrors'] = useCallback((_errors) => {
    setStateErrors(
      _errors.map((error) => ({
        validationType: VALIDATION_TYPES.FIELD,
        __isBlocking__: true,
        ...error,
      }))
    );
  }, []);

  const onChange: FieldHook<T, I>['onChange'] = useCallback(
    (event) => {
      const newValue = {}.hasOwnProperty.call(event!.target, 'checked')
        ? event.target.checked
        : event.target.value;

      setValue((newValue as unknown) as I);
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
  const getErrorsMessages: FieldHook<T, I>['getErrorsMessages'] = useCallback(
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

  /**
   * Handler to update the state and make sure the component is still mounted.
   * When resetting the form, some field might get unmounted (e.g. a toggle on "true" becomes "false" and now certain fields should not be in the DOM).
   * In that scenario there is a race condition in the "reset" method below, because the useState() hook is not synchronous.
   *
   * A better approach would be to have the state in a reducer and being able to update all values in a single dispatch action.
   */
  const updateStateIfMounted = useCallback(
    (
      state: 'isPristine' | 'isValidating' | 'isChangingValue' | 'isValidated' | 'errors' | 'value',
      nextValue: any
    ) => {
      if (isMounted.current === false) {
        return;
      }

      switch (state) {
        case 'value':
          return setValue(nextValue);
        case 'errors':
          return setStateErrors(nextValue);
        case 'isChangingValue':
          return setIsChangingValue(nextValue);
        case 'isPristine':
          return setPristine(nextValue);
        case 'isValidated':
          return setIsValidated(nextValue);
        case 'isValidating':
          return setValidating(nextValue);
      }
    },
    [setValue]
  );

  const reset: FieldHook<T, I>['reset'] = useCallback(
    (resetOptions = { resetValue: true }) => {
      const { resetValue = true, defaultValue: updatedDefaultValue } = resetOptions;

      updateStateIfMounted('isPristine', true);
      updateStateIfMounted('isValidating', false);
      updateStateIfMounted('isChangingValue', false);
      updateStateIfMounted('isValidated', false);
      updateStateIfMounted('errors', []);

      if (resetValue) {
        hasBeenReset.current = true;
        const newValue = deserializeValue(updatedDefaultValue ?? defaultValue);
        updateStateIfMounted('value', newValue);
        return newValue;
      }
    },
    [updateStateIfMounted, deserializeValue, defaultValue]
  );

  // Don't take into account non blocker validation. Some are just warning (like trying to add a wrong ComboBox item)
  const isValid = errors.filter((e) => e.__isBlocking__ !== false).length === 0;

  const field = useMemo<FieldHook<T, I>>(() => {
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
      setErrors,
      clearErrors,
      validate,
      reset,
      __isIncludedInOutput: isIncludedInOutput,
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
    isIncludedInOutput,
    onChange,
    getErrorsMessages,
    setValue,
    setErrors,
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
    // If the field value has been reset, we don't want to call the "onValueChange()"
    // as it will set the "isPristine" state to true or validate the field, which we don't want
    // to occur right after resetting the field state.
    if (hasBeenReset.current) {
      hasBeenReset.current = false;
      return;
    }

    if (!isMounted.current) {
      return;
    }

    onValueChange();

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
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
