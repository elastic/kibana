/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

import {
  FormHook,
  FieldHook,
  FieldConfig,
  FieldValidateResponse,
  ValidationError,
  FormData,
  ValidationConfig,
  FieldValidationData,
  ValidationCancelablePromise,
} from '../types';
import { FIELD_TYPES, VALIDATION_TYPES } from '../constants';

export interface InternalFieldConfig<T> {
  initialValue: T;
  isIncludedInOutput?: boolean;
}

export const useField = <T, FormType = FormData, I = T>(
  form: FormHook<FormType>,
  path: string,
  config: FieldConfig<T, FormType, I> & InternalFieldConfig<T>,
  valueChangeListener?: (value: I) => void,
  errorChangeListener?: (errors: string[] | null) => void,
  {
    validationData = null,
    validationDataProvider = () => Promise.resolve(undefined),
  }: FieldValidationData = {}
) => {
  const {
    type = FIELD_TYPES.TEXT,
    defaultValue = '' as unknown as T, // The default value instead of "undefined" (when resetting the form this will be the field value)
    initialValue, // The initial value of the field when rendering the form
    isIncludedInOutput = true,
    label = '',
    labelAppend = '',
    helpText = '',
    validations,
    formatters,
    fieldsToValidateOnChange,
    valueChangeDebounceTime = form.__options.valueChangeDebounceTime, // By default 500ms
    serializer,
    deserializer,
  } = config;

  const { getFormData, getFields, validateFields, __addField, __removeField, __getFormData$ } =
    form;

  const deserializeValue = useCallback(
    (rawValue: T): I => {
      if (typeof rawValue === 'function') {
        return deserializer ? deserializer(rawValue()) : rawValue();
      }
      return deserializer ? deserializer(rawValue) : (rawValue as unknown as I);
    },
    [deserializer]
  );

  const initialValueDeserialized = useMemo(() => {
    return deserializeValue(initialValue);
  }, [deserializeValue, initialValue]);

  const [value, setStateValue] = useState<I>(initialValueDeserialized);
  const [errors, setStateErrors] = useState<ValidationError[]>([]);
  const [isPristine, setPristine] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const [isValidating, setValidating] = useState(false);
  const [isChangingValue, setIsChangingValue] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  const isMounted = useRef<boolean>(false);
  const validateCounter = useRef(0);
  const changeCounter = useRef(0);
  const hasBeenReset = useRef<boolean>(false);
  const inflightValidation = useRef<ValidationCancelablePromise | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  // Keep a ref of the last state (value and errors) notified to the consumer so they don't get
  // loads of updates whenever they don't wrap the "onChange()" and "onError()" handlers with a useCallback
  // e.g. <UseField onChange={() => { // inline code }}
  const lastNotifiedState = useRef<{ value?: I; errors: string[] | null }>({
    value: undefined,
    errors: null,
  });

  const hasAsyncValidation = useMemo(
    () =>
      validations === undefined
        ? false
        : validations.some((validation) => validation.isAsync === true),
    [validations]
  );

  // ----------------------------------
  // -- HELPERS
  // ----------------------------------
  /**
   * Filter an array of errors for a specific validation type
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
    (inputValue: unknown): I => {
      const isEmptyString = typeof inputValue === 'string' && inputValue.trim() === '';

      if (isEmptyString || !formatters) {
        return inputValue as I;
      }

      const formData = __getFormData$().value;

      return formatters.reduce((output, formatter) => formatter(output, formData), inputValue) as I;
    },
    [formatters, __getFormData$]
  );

  const runValidationsOnValueChange = useCallback(
    async (done: () => void) => {
      const changeIteration = ++changeCounter.current;
      const startTime = Date.now();

      // We call "validateFields" on the form which in turn will call
      // our "validate()" function here below.
      // The form is the coordinator and has access to all of the fields. We can
      // this way validate multiple field whenever one field value changes.
      await validateFields(fieldsToValidateOnChange ?? [path]);

      if (!isMounted.current) {
        return;
      }

      /**
       * If we have set a delay to display possible validation error message after the field value has changed we
       * 1. check that this is the last "change iteration" (--> the last keystroke from the user)
       * 2. verify how long we've already waited for to run the validations (those can be async and make HTTP requests).
       * 3. (if needed) add a timeout to set the "isChangingValue" state back to "false".
       */
      if (changeIteration === changeCounter.current) {
        if (valueChangeDebounceTime > 0) {
          const timeElapsed = Date.now() - startTime;

          if (timeElapsed < valueChangeDebounceTime) {
            const timeLeftToWait = valueChangeDebounceTime - timeElapsed;

            debounceTimeout.current = setTimeout(() => {
              debounceTimeout.current = null;
              done();
            }, timeLeftToWait);

            return;
          }
        }

        done();
      }
    },
    [path, valueChangeDebounceTime, fieldsToValidateOnChange, validateFields]
  );

  // Cancel any inflight validation (e.g an HTTP Request)
  const cancelInflightValidation = useCallback(() => {
    if (inflightValidation.current && typeof inflightValidation.current.cancel === 'function') {
      inflightValidation.current.cancel();
      inflightValidation.current = null;
    }
  }, []);

  /**
   * Run all the validations in sequence. If any of the validations is marked as asynchronous
   * ("isAsync: true") this method will be asynchronous.
   * The reason why we maintain both a "sync" and "async" option for field.validate() is because
   * in some cases validating a field must be synchronous (e.g. when adding an item to the EuiCombobox,
   * we want to first validate the value before adding it. The "onCreateOption" handler expects a boolean
   * to be returned synchronously).
   * Keeping both alternative (sync and async) is then a good thing to avoid refactoring dependencies (and
   * the whole jungle with it!).
   */
  const runValidations = useCallback(
    (
      {
        formData,
        value: valueToValidate,
        onlyBlocking: runOnlyBlockingValidations,
        validationTypeToValidate,
      }: {
        formData: any;
        value: I;
        onlyBlocking: boolean;
        validationTypeToValidate: string;
      },
      clearFieldErrors: FieldHook['clearErrors']
    ): ValidationError[] | Promise<ValidationError[]> => {
      if (!validations) {
        return [];
      }

      // -- helpers
      const doByPassValidation = ({
        type: validationType,
        isBlocking,
      }: ValidationConfig<FormType, string, I>) => {
        if (validationType !== undefined && validationType !== validationTypeToValidate) {
          return true;
        }

        if (runOnlyBlockingValidations && isBlocking === false) {
          return true;
        }

        return false;
      };

      const enhanceValidationError = (
        validationError: ValidationError,
        validation: ValidationConfig<FormType, string, I>,
        validationType: string
      ) => ({
        ...validationError,
        // We add an "__isBlocking__" property to know if this error is a blocker or no.
        // Most validation errors are blockers but in some cases a validation is more a warning than an error
        // (e.g when adding an item to the EuiComboBox item. The item might be invalid and can't be added
        // but the field (the array of items) is still valid).
        __isBlocking__: validationError.__isBlocking__ ?? validation.isBlocking,
        validationType,
      });

      const runAsync = async () => {
        const validationErrors: ValidationError[] = [];

        for (const validation of validations) {
          const {
            validator,
            exitOnFail = true,
            type: validationType = VALIDATION_TYPES.FIELD,
          } = validation;

          if (doByPassValidation(validation)) {
            continue;
          }

          inflightValidation.current = validator({
            value: valueToValidate,
            errors: validationErrors,
            form: { getFormData, getFields },
            formData,
            path,
            customData: { provider: validationDataProvider, value: validationData },
          }) as ValidationCancelablePromise;

          const validationResult = await inflightValidation.current;

          inflightValidation.current = null;

          if (!validationResult) {
            continue;
          }

          validationErrors.push(
            enhanceValidationError(validationResult, validation, validationType)
          );

          if (exitOnFail) {
            break;
          }
        }

        return validationErrors;
      };

      const runSync = () => {
        const validationErrors: ValidationError[] = [];

        for (const validation of validations) {
          const {
            validator,
            exitOnFail = true,
            type: validationType = VALIDATION_TYPES.FIELD,
          } = validation;

          if (doByPassValidation(validation)) {
            continue;
          }

          const validationResult = validator({
            value: valueToValidate,
            errors: validationErrors,
            form: { getFormData, getFields },
            formData,
            path,
            customData: { provider: validationDataProvider, value: validationData },
          });

          if (!validationResult) {
            continue;
          }

          if (!!validationResult.then) {
            // The validator returned a Promise: abort and run the validations asynchronously.
            // This is a fallback mechansim, it is recommended to explicitly mark a validation
            // as asynchronous with the "isAsync" flag to avoid runnning twice the same validation
            // (and possible HTTP requests).
            // We keep a reference to the inflight promise so we can cancel it.

            inflightValidation.current = validationResult as ValidationCancelablePromise;
            cancelInflightValidation();

            return runAsync();
          }

          validationErrors.push(
            enhanceValidationError(validationResult as ValidationError, validation, validationType)
          );

          if (exitOnFail) {
            break;
          }
        }

        return validationErrors;
      };
      // -- end helpers

      clearFieldErrors([
        validationTypeToValidate ?? VALIDATION_TYPES.FIELD,
        VALIDATION_TYPES.ASYNC, // Immediately clear errors for "async" type validations.
      ]);

      cancelInflightValidation();

      if (hasAsyncValidation) {
        return runAsync();
      }

      return runSync();
    },
    [
      cancelInflightValidation,
      validations,
      hasAsyncValidation,
      getFormData,
      getFields,
      path,
      validationData,
      validationDataProvider,
    ]
  );

  // ----------------------------------
  // -- Internal API
  // ----------------------------------
  const serializeValue: FieldHook<T, I>['__serializeValue'] = useCallback(
    (internalValue: I = value) => {
      return serializer ? serializer(internalValue) : (internalValue as unknown as T);
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
    (validationConfig = {}) => {
      const {
        formData = __getFormData$().value,
        value: valueToValidate = value,
        validationType = VALIDATION_TYPES.FIELD,
        onlyBlocking = false,
      } = validationConfig;

      setValidating(true);

      // By the time our validate function has reached completion, it’s possible
      // that we have called validate() again. If this is the case, we need
      // to ignore the results of this invocation and only use the results of
      // the most recent invocation to update the error state for a field
      const validateIteration = ++validateCounter.current;

      const onValidationResult = (_validationErrors: ValidationError[]): FieldValidateResponse => {
        if (validateIteration === validateCounter.current && isMounted.current) {
          // This is the most recent invocation
          setValidating(false);
          setIsValidated(true);
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
          onlyBlocking,
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
        let _newValue = newValue;

        if (typeof _newValue === 'function') {
          _newValue = (_newValue as Function)(prev);
        }

        return formatInputValue(_newValue);
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

      setValue(newValue as unknown as I);
    },
    [setValue]
  );

  const getErrorsMessages: FieldHook<T, I>['getErrorsMessages'] = useCallback(
    ({ errorCode, validationType = VALIDATION_TYPES.FIELD } = {}) => {
      const errorMessages = errors.reduce((messages, error) => {
        const isSameErrorCode = errorCode && error.code === errorCode;
        const isSamevalidationType =
          error.validationType === validationType ||
          (validationType === VALIDATION_TYPES.FIELD &&
            !{}.hasOwnProperty.call(error, 'validationType'));

        if (isSameErrorCode || (typeof errorCode === 'undefined' && isSamevalidationType)) {
          return messages
            ? `${messages}, ${error.message}` // concatenate error message
            : error.message;
        }

        return messages;
      }, '');

      return errorMessages ? errorMessages : null;
    },
    [errors]
  );

  const reset: FieldHook<T, I>['reset'] = useCallback(
    (resetOptions = { resetValue: true }) => {
      const { resetValue = true, defaultValue: updatedDefaultValue } = resetOptions;

      setPristine(true);

      if (isMounted.current) {
        setIsModified(false);
        setValidating(false);
        setIsChangingValue(false);
        setIsValidated(false);
        setStateErrors([]);

        if (resetValue) {
          hasBeenReset.current = true;
          const newValue = deserializeValue(updatedDefaultValue ?? defaultValue);
          setValue(newValue);
          return newValue;
        }
      }
    },
    [deserializeValue, defaultValue, setValue, setStateErrors]
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
      isDirty: !isPristine,
      isModified,
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
    isModified,
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
    // Add the fieldHook object to the form "fieldsRefs" map
    __addField(field);
  }, [field, __addField]);

  useEffect(() => {
    return () => {
      // We only remove the field from the form "fieldsRefs" map when its path
      // changes (which in practice never occurs) or whenever the <UseField /> unmounts
      __removeField(path);
    };
  }, [path, __removeField]);

  // Value change: notify prop listener (<UseField onChange={() => {...}})
  // We have a separate useEffect for this as the "onChange" handler pass through prop
  // might not be wrapped inside a "useCallback" and that would trigger a possible infinite
  // amount of effect executions.
  useEffect(() => {
    if (!isMounted.current || value === undefined) {
      return;
    }

    if (valueChangeListener && value !== lastNotifiedState.current.value) {
      valueChangeListener(value);
      lastNotifiedState.current.value = value;
    }
  }, [value, valueChangeListener]);

  // Value change: update state and run validations
  useEffect(() => {
    if (!isMounted.current) {
      return;
    }

    if (hasBeenReset.current) {
      // If the field value has just been reset (triggering this useEffect)
      // we don't want to set the "isPristine" state to true and validate the field
      hasBeenReset.current = false;
    } else {
      setPristine(false);
      setIsChangingValue(true);

      runValidationsOnValueChange(() => {
        if (isMounted.current) {
          setIsChangingValue(false);
        }
      });
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    };
  }, [value, runValidationsOnValueChange]);

  // Value change: set "isModified" state
  useEffect(() => {
    setIsModified(() => {
      if (typeof value === 'object') {
        return JSON.stringify(value) !== JSON.stringify(initialValueDeserialized);
      }
      return value !== initialValueDeserialized;
    });
  }, [value, initialValueDeserialized]);

  // Errors change: notify prop listener (<UseField onError={() => {...}} />)
  useEffect(() => {
    if (!isMounted.current) {
      return;
    }

    const errorMessages = errors.length ? errors.map((error) => error.message) : null;

    if (errorChangeListener && lastNotifiedState.current.errors !== errorMessages) {
      errorChangeListener(errorMessages);
      lastNotifiedState.current.errors = errorMessages;
    }
  }, [errors, errorChangeListener]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return field;
};
