/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { get } from 'lodash';
import { set } from '@elastic/safer-lodash-set';

import { FormHook, FieldHook, FormData, FieldsMap, FormConfig } from '../types';
import { mapFormFields, unflattenObject, flattenObject, Subject, Subscription } from '../lib';

const DEFAULT_OPTIONS = {
  valueChangeDebounceTime: 500,
  stripEmptyFields: true,
};

export interface UseFormReturn<T extends FormData, I extends FormData> {
  form: FormHook<T, I>;
}

export function useForm<T extends FormData = FormData, I extends FormData = T>(
  formConfig?: FormConfig<T, I>
): UseFormReturn<T, I> {
  const {
    onSubmit,
    schema,
    serializer,
    deserializer,
    options,
    id = 'default',
    defaultValue,
  } = formConfig ?? {};

  // Strip out any "undefined" value and run the deserializer
  const initDefaultValue = useCallback(
    (_defaultValue?: Partial<T>): I | undefined => {
      if (_defaultValue === undefined || Object.keys(_defaultValue).length === 0) {
        return undefined;
      }

      const filtered = Object.entries(_defaultValue as object)
        .filter(({ 1: value }) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as T);

      return deserializer ? deserializer(filtered) : (filtered as unknown as I);
    },
    [deserializer]
  );

  // We create this stable reference to be able to initialize our "defaultValueDeserialized" ref below
  // as we can't initialize useRef by calling a function (e.g. useRef(initDefaultValue()))
  const defaultValueMemoized = useMemo<I | undefined>(() => {
    return initDefaultValue(defaultValue);
  }, [defaultValue, initDefaultValue]);

  const { valueChangeDebounceTime, stripEmptyFields: doStripEmptyFields } = options ?? {};
  const formOptions = useMemo(
    () => ({
      stripEmptyFields: doStripEmptyFields ?? DEFAULT_OPTIONS.stripEmptyFields,
      valueChangeDebounceTime: valueChangeDebounceTime ?? DEFAULT_OPTIONS.valueChangeDebounceTime,
    }),
    [valueChangeDebounceTime, doStripEmptyFields]
  );

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [errorMessages, setErrorMessages] = useState<{ [fieldName: string]: string }>({});

  /**
   * Map of all the fields currently in the form
   */
  const fieldsRefs = useRef<FieldsMap>({});
  /**
   * Keep a track of the fields that have been removed from the form.
   * This will allow us to know if the form has been modified
   * (this ref is then accessed in the "useFormIsModified()" hook)
   */
  const fieldsRemovedRefs = useRef<FieldsMap>({});
  /**
   * A list of all subscribers to form data and validity changes that
   * called "form.subscribe()"
   */
  const formUpdateSubscribers = useRef<Subscription[]>([]);
  const isMounted = useRef<boolean>(false);
  /**
   * Keep a reference to the form defaultValue once it has been deserialized.
   * This allows us to reset the form and put back the initial value of each fields
   */
  const defaultValueDeserialized = useRef(defaultValueMemoized);

  /**
   * We have both a state and a ref for the error messages so the consumer can, in the same callback,
   * validate the form **and** have the errors returned immediately.
   * Note: As an alternative we could return the errors when calling the "validate()" method but that creates
   * a breaking change in the API which would require to update many forms.
   *
   * ```
   * const myHandler = useCallback(async () => {
   *   const isFormValid = await validate();
   *   const errors = getErrors(); // errors from the validate() call are there
   * }, [validate, getErrors]);
   * ```
   */
  const errorMessagesRef = useRef<{ [fieldName: string]: string }>({});

  /**
   * formData$ is an observable that gets updated every time a field value changes.
   * It is the "useFormData()" hook that subscribes to this observable and updates
   * its internal "formData" state that in turn triggers the necessary re-renders in the consumer component.
   */
  const formData$ = useRef<Subject<FormData> | null>(null);

  // ----------------------------------
  // -- HELPERS
  // ----------------------------------
  /**
   * We can't initialize a React ref by calling a function (in this case
   * useRef(new Subject())) the function is called on every render and would
   * create a new "Subject" instance.
   * We use this handler to access the ref and initialize it on first access.
   */
  const getFormData$ = useCallback((): Subject<FormData> => {
    if (formData$.current === null) {
      formData$.current = new Subject<FormData>({});
    }
    return formData$.current;
  }, []);

  const updateFormData$ = useCallback(
    (nextValue: FormData) => {
      getFormData$().next(nextValue);
    },
    [getFormData$]
  );

  const updateFieldErrorMessage = useCallback((path: string, errorMessage: string | null) => {
    setErrorMessages((prev) => {
      const previousMessageValue = prev[path];

      if (
        errorMessage === previousMessageValue ||
        (previousMessageValue === undefined && errorMessage === null)
      ) {
        // Don't update the state, the error message has not changed.
        return prev;
      }

      if (errorMessage === null) {
        // The field at this path is now valid, we strip out any previous error message
        const { [path]: discard, ...next } = prev;
        errorMessagesRef.current = next;
        return next;
      }

      const next = {
        ...prev,
        [path]: errorMessage,
      };
      errorMessagesRef.current = next;
      return next;
    });
  }, []);

  const fieldsToArray = useCallback<() => FieldHook[]>(() => Object.values(fieldsRefs.current), []);

  const getFieldsForOutput = useCallback(
    (fields: FieldsMap, opts: { stripEmptyFields: boolean }): FieldsMap => {
      return Object.entries(fields).reduce((acc, [key, field]) => {
        if (!field.__isIncludedInOutput) {
          return acc;
        }

        if (opts.stripEmptyFields) {
          const isFieldEmpty = typeof field.value === 'string' && field.value.trim() === '';
          if (isFieldEmpty) {
            return acc;
          }
        }

        acc[key] = field;
        return acc;
      }, {} as FieldsMap);
    },
    []
  );

  const updateFormDataAt: FormHook<T, I>['__updateFormDataAt'] = useCallback(
    (path, value) => {
      const currentFormData = getFormData$().value;

      if (currentFormData[path] !== value) {
        updateFormData$({ ...currentFormData, [path]: value });
      }
    },
    [getFormData$, updateFormData$]
  );

  const updateDefaultValueAt: FormHook<T, I>['__updateDefaultValueAt'] = useCallback(
    (path, value) => {
      if (defaultValueDeserialized.current === undefined) {
        defaultValueDeserialized.current = {} as I;
      }

      // We allow "undefined" to be passed to be able to remove a value from the form `defaultValue` object.
      // When <UseField path="foo" defaultValue="bar" /> mounts it calls `updateDefaultValueAt("foo", "bar")` to
      // update the form "defaultValue" object. When that component unmounts we want to be able to clean up and
      // remove its defaultValue on the form.
      if (value === undefined) {
        const updated = flattenObject(defaultValueDeserialized.current!);
        delete updated[path];
        defaultValueDeserialized.current = unflattenObject<I>(updated);
      } else {
        set(defaultValueDeserialized.current!, path, value);
      }
    },
    []
  );

  const isFieldValid = (field: FieldHook) => field.isValid && !field.isValidating;

  const waitForFieldsToFinishValidating = useCallback(async () => {
    let areSomeFieldValidating = fieldsToArray().some((field) => field.isValidating);
    if (!areSomeFieldValidating) {
      return;
    }

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        areSomeFieldValidating = fieldsToArray().some((field) => field.isValidating);
        if (areSomeFieldValidating) {
          // Recursively wait for all the fields to finish validating.
          return waitForFieldsToFinishValidating().then(resolve);
        }
        resolve();
      }, 100);
    });
  }, [fieldsToArray]);

  // ----------------------------------
  // -- Internal API
  // ----------------------------------
  const addField: FormHook<T, I>['__addField'] = useCallback(
    (field) => {
      const fieldPreviouslyAdded = fieldsRefs.current[field.path] !== undefined;
      fieldsRefs.current[field.path] = field;
      delete fieldsRemovedRefs.current[field.path];

      updateFormDataAt(field.path, field.value);
      updateFieldErrorMessage(field.path, field.getErrorsMessages());

      if (!fieldPreviouslyAdded && !field.isValidated) {
        setIsValid(undefined);

        // When we submit() the form we set the "isSubmitted" state to "true" and all fields are marked as "isValidated: true".
        // If a **new** field is added and and its "isValidated" is "false" it means that we have swapped fields and added new ones:
        // --> we have a new form in front of us with different set of fields. We need to reset the "isSubmitted" state.
        // (e.g. In the mappings editor when the user switches the field "type" it brings a whole new set of settings)
        setIsSubmitted(false);
      }
    },
    [updateFormDataAt, updateFieldErrorMessage]
  );

  const removeField: FormHook<T, I>['__removeField'] = useCallback(
    (_fieldNames) => {
      const fieldNames = Array.isArray(_fieldNames) ? _fieldNames : [_fieldNames];
      const updatedFormData = { ...getFormData$().value };

      fieldNames.forEach((name) => {
        fieldsRemovedRefs.current[name] = fieldsRefs.current[name];
        updateFieldErrorMessage(name, null);
        delete fieldsRefs.current[name];
        delete updatedFormData[name];
      });

      updateFormData$(updatedFormData);

      /**
       * After removing a field, the form validity might have changed
       * (an invalid field might have been removed and now the form is valid)
       */
      setIsValid((prev) => {
        if (prev === false) {
          const isFormValid = fieldsToArray().every(isFieldValid);
          return isFormValid;
        }
        // If the form validity is "true" or "undefined", it remains the same after removing a field
        return prev;
      });
    },
    [getFormData$, updateFormData$, fieldsToArray, updateFieldErrorMessage]
  );

  const getFormDefaultValue: FormHook<T, I>['__getFormDefaultValue'] = useCallback(
    () => defaultValueDeserialized.current,
    []
  );

  const readFieldConfigFromSchema: FormHook<T, I>['__readFieldConfigFromSchema'] = useCallback(
    (fieldName) => {
      const config = get(schema ?? {}, fieldName);

      return config;
    },
    [schema]
  );

  const getFieldsRemoved: FormHook<T, I>['getFields'] = useCallback(
    () => fieldsRemovedRefs.current,
    []
  );

  // ----------------------------------
  // -- Public API
  // ----------------------------------
  const validateFields: FormHook<T, I>['validateFields'] = useCallback(
    async (fieldNames, onlyBlocking = false) => {
      const fieldsToValidate = fieldNames
        .map((name) => fieldsRefs.current[name])
        .filter((field) => field !== undefined);

      const formData = getFormData$().value;
      const validationResult = await Promise.all(
        fieldsToValidate.map((field) => field.validate({ formData, onlyBlocking }))
      );

      if (isMounted.current === false) {
        // If the form has unmounted while validating, the result is not pertinent
        // anymore. Let's satisfy TS and exit.
        return { areFieldsValid: true, isFormValid: true };
      }

      const areFieldsValid = validationResult.every((res) => res.isValid);

      const validationResultByPath = fieldsToValidate.reduce((acc, field, i) => {
        acc[field.path] = validationResult[i].isValid;
        return acc;
      }, {} as { [fieldPath: string]: boolean });

      // At this stage we have an updated field validation state inside the "validationResultByPath" object.
      // The fields object in "fieldsRefs.current" have not been updated yet with their new validation state
      // (isValid, isValidated...) as this occurs later, when the "useEffect" kicks in and calls "addField()" on the form.
      // This means that we have **stale state value** in our fieldsRefs map.
      // To know the current form validity, we will then merge the "validationResult" with the fieldsRefs object state.
      const formFieldsValidity = fieldsToArray().map((field) => {
        const hasUpdatedValidity = validationResultByPath[field.path] !== undefined;

        return {
          isValid: validationResultByPath[field.path] ?? field.isValid,
          isValidated: hasUpdatedValidity ? true : field.isValidated,
          isValidating: hasUpdatedValidity ? false : field.isValidating,
        };
      });

      const areAllFieldsValidated = formFieldsValidity.every((field) => field.isValidated);
      const areSomeFieldValidating = formFieldsValidity.some((field) => field.isValidating);

      // If *not* all the fields have been validated, the validity of the form is unknown, thus still "undefined"
      const isFormValid =
        areAllFieldsValidated && areSomeFieldValidating === false
          ? formFieldsValidity.every((field) => field.isValid)
          : undefined;

      setIsValid(isFormValid);

      return { areFieldsValid, isFormValid };
    },
    [getFormData$, fieldsToArray]
  );

  const getFormData: FormHook<T, I>['getFormData'] = useCallback(() => {
    const fieldsToOutput = getFieldsForOutput(fieldsRefs.current, {
      stripEmptyFields: formOptions.stripEmptyFields,
    });
    const fieldsValue = mapFormFields(fieldsToOutput, (field) => field.__serializeValue());
    return serializer
      ? serializer(unflattenObject<I>(fieldsValue))
      : unflattenObject<T>(fieldsValue);
  }, [getFieldsForOutput, formOptions.stripEmptyFields, serializer]);

  const getErrors: FormHook<T, I>['getErrors'] = useCallback(() => {
    if (isValid === true) {
      return [];
    }
    return Object.values({ ...errorMessages, ...errorMessagesRef.current });
  }, [isValid, errorMessages]);

  const validate: FormHook<T, I>['validate'] = useCallback(async (): Promise<boolean> => {
    // Maybe some field are being validated because of their async validation(s).
    // We make sure those validations have finished executing before proceeding.
    await waitForFieldsToFinishValidating();

    if (!isMounted.current) {
      return false;
    }

    const fieldsArray = fieldsToArray();
    // We only need to validate the fields that haven't been validated yet. Those
    // are pristine fields (dirty fields are always validated when their value changed)
    const fieldsToValidate = fieldsArray.filter((field) => !field.isValidated);

    let isFormValid: boolean | undefined;

    if (fieldsToValidate.length === 0) {
      isFormValid = fieldsArray.every(isFieldValid);
    } else {
      const fieldPathsToValidate = fieldsToValidate.map((field) => field.path);
      const validateOnlyBlockingValidation = true;
      ({ isFormValid } = await validateFields(
        fieldPathsToValidate,
        validateOnlyBlockingValidation
      ));
    }

    setIsValid(isFormValid);
    return isFormValid!;
  }, [fieldsToArray, validateFields, waitForFieldsToFinishValidating]);

  const setFieldValue: FormHook<T, I>['setFieldValue'] = useCallback((fieldName, value) => {
    if (fieldsRefs.current[fieldName]) {
      fieldsRefs.current[fieldName].setValue(value);
    }
  }, []);

  const setFieldErrors: FormHook<T, I>['setFieldErrors'] = useCallback((fieldName, errors) => {
    if (fieldsRefs.current[fieldName]) {
      fieldsRefs.current[fieldName].setErrors(errors);
    }
  }, []);

  const getFields: FormHook<T, I>['getFields'] = useCallback(() => fieldsRefs.current, []);

  const getFieldDefaultValue: FormHook<T, I>['getFieldDefaultValue'] = useCallback(
    (fieldName) => get(defaultValueDeserialized.current ?? {}, fieldName),
    []
  );

  const submit: FormHook<T, I>['submit'] = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitted(true); // User has attempted to submit the form at least once
      setSubmitting(true);

      const isFormValid = await validate();
      const formData = isFormValid ? getFormData() : ({} as T);

      if (onSubmit) {
        await onSubmit(formData, isFormValid!);
      }

      if (isMounted.current) {
        setSubmitting(false);
      }

      return { data: formData, isValid: isFormValid! };
    },
    [validate, getFormData, onSubmit]
  );

  const subscribe: FormHook<T, I>['subscribe'] = useCallback(
    (handler) => {
      const subscription = getFormData$().subscribe((raw) => {
        handler({
          isValid,
          data: { internal: unflattenObject<I>(raw), format: getFormData },
          validate,
        });
      });

      formUpdateSubscribers.current.push(subscription);

      return {
        unsubscribe() {
          formUpdateSubscribers.current = formUpdateSubscribers.current.filter(
            (sub) => sub !== subscription
          );
          return subscription.unsubscribe();
        },
      };
    },
    [getFormData$, isValid, getFormData, validate]
  );

  const reset: FormHook<T, I>['reset'] = useCallback(
    (resetOptions = { resetValues: true }) => {
      const { resetValues = true, defaultValue: updatedDefaultValue } = resetOptions;
      const currentFormData = { ...getFormData$().value };

      if (updatedDefaultValue) {
        defaultValueDeserialized.current = initDefaultValue(updatedDefaultValue);
      }

      Object.entries(fieldsRefs.current).forEach(([path, field]) => {
        // By resetting the form and changing field values, some fields might be unmounted
        // (e.g. a toggle might be set back to "false" and some fields removed from the UI as a consequence).
        // We make sure that the field still exists before resetting it.
        const isFieldMounted = fieldsRefs.current[path] !== undefined;
        if (isFieldMounted) {
          const fieldDefaultValue = getFieldDefaultValue(path);
          field.reset({ resetValue: resetValues, defaultValue: fieldDefaultValue });
          currentFormData[path] = fieldDefaultValue;
        }
      });

      if (resetValues) {
        updateFormData$(currentFormData);
      }

      setIsSubmitted(false);
      setSubmitting(false);
      setIsValid(undefined);
    },
    [getFormData$, updateFormData$, initDefaultValue, getFieldDefaultValue]
  );

  const form = useMemo<FormHook<T, I>>(() => {
    return {
      isSubmitted,
      isSubmitting,
      isValid,
      id,
      submit,
      validate,
      subscribe,
      setFieldValue,
      setFieldErrors,
      getFields,
      getFieldDefaultValue,
      getFormData,
      getErrors,
      reset,
      validateFields,
      __options: formOptions,
      __getFormData$: getFormData$,
      __updateFormDataAt: updateFormDataAt,
      __updateDefaultValueAt: updateDefaultValueAt,
      __readFieldConfigFromSchema: readFieldConfigFromSchema,
      __getFormDefaultValue: getFormDefaultValue,
      __addField: addField,
      __removeField: removeField,
      __getFieldsRemoved: getFieldsRemoved,
    };
  }, [
    isSubmitted,
    isSubmitting,
    isValid,
    id,
    submit,
    subscribe,
    setFieldValue,
    setFieldErrors,
    getFields,
    getFieldsRemoved,
    getFormData,
    getErrors,
    getFormDefaultValue,
    getFieldDefaultValue,
    reset,
    formOptions,
    getFormData$,
    updateFormDataAt,
    updateDefaultValueAt,
    readFieldConfigFromSchema,
    addField,
    removeField,
    validateFields,
    validate,
  ]);

  // ----------------------------------
  // -- EFFECTS
  // ----------------------------------

  useEffect(() => {
    if (!isMounted.current) {
      return;
    }

    // Whenever the "defaultValue" prop changes, reinitialize our ref
    defaultValueDeserialized.current = defaultValueMemoized;
  }, [defaultValueMemoized]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      formUpdateSubscribers.current.forEach((subscription) => subscription.unsubscribe());
      formUpdateSubscribers.current = [];
    };
  }, []);

  return {
    form,
  };
}
