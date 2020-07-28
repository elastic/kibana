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

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { get } from 'lodash';

import { FormHook, FieldHook, FormData, FieldConfig, FieldsMap, FormConfig } from '../types';
import { mapFormFields, unflattenObject, Subject, Subscription } from '../lib';

const DEFAULT_ERROR_DISPLAY_TIMEOUT = 500;
const DEFAULT_OPTIONS = {
  errorDisplayDelay: DEFAULT_ERROR_DISPLAY_TIMEOUT,
  stripEmptyFields: true,
};

interface UseFormReturn<T extends FormData> {
  form: FormHook<T>;
}

export function useForm<T extends FormData = FormData>(
  formConfig?: FormConfig<T>
): UseFormReturn<T> {
  const { onSubmit, schema, serializer, deserializer, options, id = 'default', defaultValue } =
    formConfig ?? {};

  const formDefaultValue = useMemo(() => {
    if (defaultValue === undefined || Object.keys(defaultValue).length === 0) {
      return {};
    }

    return Object.entries(defaultValue as object)
      .filter(({ 1: value }) => value !== undefined)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }, [defaultValue]);

  const { errorDisplayDelay, stripEmptyFields: doStripEmptyFields } = options ?? {};
  const formOptions = useMemo(
    () => ({
      stripEmptyFields: doStripEmptyFields ?? DEFAULT_OPTIONS.stripEmptyFields,
      errorDisplayDelay: errorDisplayDelay ?? DEFAULT_OPTIONS.errorDisplayDelay,
    }),
    [errorDisplayDelay, doStripEmptyFields]
  );

  const defaultValueDeserialized = useMemo(
    () => (deserializer ? deserializer(formDefaultValue) : formDefaultValue),
    [formDefaultValue, deserializer]
  );

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const fieldsRefs = useRef<FieldsMap>({});
  const formUpdateSubscribers = useRef<Subscription[]>([]);
  const isUnmounted = useRef<boolean>(false);

  // formData$ is an observable we can subscribe to in order to receive live
  // update of the raw form data. As an observable it does not trigger any React
  // render().
  // The <FormDataProvider> component is the one in charge of reading this observable
  // and updating its state to trigger the necessary view render.
  const formData$ = useRef<Subject<T> | null>(null);

  useEffect(() => {
    return () => {
      formUpdateSubscribers.current.forEach((subscription) => subscription.unsubscribe());
      formUpdateSubscribers.current = [];
      isUnmounted.current = true;
    };
  }, []);

  // -- HELPERS
  // ----------------------------------
  const getFormData$ = useCallback((): Subject<T> => {
    if (formData$.current === null) {
      formData$.current = new Subject<T>({} as T);
    }
    return formData$.current;
  }, []);

  const fieldsToArray = useCallback(() => Object.values(fieldsRefs.current), []);

  const stripEmptyFields = useCallback(
    (fields: FieldsMap): FieldsMap => {
      if (formOptions.stripEmptyFields) {
        return Object.entries(fields).reduce((acc, [key, field]) => {
          if (typeof field.value !== 'string' || field.value.trim() !== '') {
            acc[key] = field;
          }
          return acc;
        }, {} as FieldsMap);
      }
      return fields;
    },
    [formOptions]
  );

  const updateFormDataAt: FormHook<T>['__updateFormDataAt'] = useCallback(
    (path, value) => {
      const _formData$ = getFormData$();
      const currentFormData = _formData$.value;

      if (currentFormData[path] !== value) {
        _formData$.next({ ...currentFormData, [path]: value });
      }

      return _formData$.value;
    },
    [getFormData$]
  );

  // -- API
  // ----------------------------------
  const getFormData: FormHook<T>['getFormData'] = useCallback(
    (getDataOptions: Parameters<FormHook<T>['getFormData']>[0] = { unflatten: true }) => {
      if (getDataOptions.unflatten) {
        const nonEmptyFields = stripEmptyFields(fieldsRefs.current);
        const fieldsValue = mapFormFields(nonEmptyFields, (field) => field.__serializeOutput());
        return serializer
          ? (serializer(unflattenObject(fieldsValue)) as T)
          : (unflattenObject(fieldsValue) as T);
      }

      return Object.entries(fieldsRefs.current).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]: field.__serializeOutput(),
        }),
        {} as T
      );
    },
    [stripEmptyFields, serializer]
  );

  const getErrors: FormHook['getErrors'] = useCallback(() => {
    if (isValid === true) {
      return [];
    }

    return fieldsToArray().reduce((acc, field) => {
      const fieldError = field.getErrorsMessages();
      if (fieldError === null) {
        return acc;
      }
      return [...acc, fieldError];
    }, [] as string[]);
  }, [isValid, fieldsToArray]);

  const isFieldValid = (field: FieldHook) => field.isValid && !field.isValidating;

  const updateFormValidity = useCallback(() => {
    if (isUnmounted.current) {
      return;
    }

    const fieldsArray = fieldsToArray();
    const areAllFieldsValidated = fieldsArray.every((field) => field.isValidated);

    if (!areAllFieldsValidated) {
      // If *not* all the fiels have been validated, the validity of the form is unknown, thus still "undefined"
      return undefined;
    }

    const isFormValid = fieldsArray.every(isFieldValid);

    setIsValid(isFormValid);
    return isFormValid;
  }, [fieldsToArray]);

  const validateFields: FormHook<T>['__validateFields'] = useCallback(
    async (fieldNames) => {
      const fieldsToValidate = fieldNames
        .map((name) => fieldsRefs.current[name])
        .filter((field) => field !== undefined);

      if (fieldsToValidate.length === 0) {
        // Nothing to validate
        return { areFieldsValid: true, isFormValid: true };
      }

      const formData = getFormData({ unflatten: false });
      await Promise.all(fieldsToValidate.map((field) => field.validate({ formData })));

      const isFormValid = updateFormValidity();
      const areFieldsValid = fieldsToValidate.every(isFieldValid);

      return { areFieldsValid, isFormValid };
    },
    [getFormData, updateFormValidity]
  );

  const validateAllFields = useCallback(async (): Promise<boolean> => {
    const fieldsArray = fieldsToArray();
    const fieldsToValidate = fieldsArray.filter((field) => !field.isValidated);

    let isFormValid: boolean | undefined;

    if (fieldsToValidate.length === 0) {
      // We should never enter this condition as the form validity is updated each time
      // a field is validated. But sometimes, during tests or race conditions it does not happen and we need
      // to wait the next tick (hooks lifecycle being tricky) to make sure the "isValid" state is updated.
      // In order to avoid this unintentional behaviour, we add this if condition here.

      // TODO: Fix this when adding tests to the form lib.
      isFormValid = fieldsArray.every(isFieldValid);
      setIsValid(isFormValid);
      return isFormValid;
    }

    ({ isFormValid } = await validateFields(fieldsToValidate.map((field) => field.path)));

    return isFormValid!;
  }, [fieldsToArray, validateFields]);

  const addField: FormHook<T>['__addField'] = useCallback(
    (field) => {
      fieldsRefs.current[field.path] = field;

      if (!{}.hasOwnProperty.call(getFormData$().value, field.path)) {
        const fieldValue = field.__serializeOutput();
        updateFormDataAt(field.path, fieldValue);
      }
    },
    [getFormData$, updateFormDataAt]
  );

  const removeField: FormHook<T>['__removeField'] = useCallback(
    (_fieldNames) => {
      const fieldNames = Array.isArray(_fieldNames) ? _fieldNames : [_fieldNames];
      const currentFormData = { ...getFormData$().value } as FormData;

      fieldNames.forEach((name) => {
        delete fieldsRefs.current[name];
        delete currentFormData[name];
      });

      getFormData$().next(currentFormData as T);

      /**
       * After removing a field, the form validity might have changed
       * (an invalid field might have been removed and now the form is valid)
       */
      updateFormValidity();
    },
    [getFormData$, updateFormValidity]
  );

  const setFieldValue: FormHook<T>['setFieldValue'] = useCallback((fieldName, value) => {
    if (fieldsRefs.current[fieldName] === undefined) {
      return;
    }
    fieldsRefs.current[fieldName].setValue(value);
  }, []);

  const setFieldErrors: FormHook<T>['setFieldErrors'] = useCallback((fieldName, errors) => {
    if (fieldsRefs.current[fieldName] === undefined) {
      return;
    }
    fieldsRefs.current[fieldName].setErrors(errors);
  }, []);

  const getFields: FormHook<T>['getFields'] = useCallback(() => fieldsRefs.current, []);

  const getFieldDefaultValue: FormHook['getFieldDefaultValue'] = useCallback(
    (fieldName) => get(defaultValueDeserialized, fieldName),
    [defaultValueDeserialized]
  );

  const readFieldConfigFromSchema: FormHook<T>['__readFieldConfigFromSchema'] = useCallback(
    (fieldName) => {
      const config = (get(schema ?? {}, fieldName) as FieldConfig) || {};

      return config;
    },
    [schema]
  );

  const submitForm: FormHook<T>['submit'] = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitted(true); // User has attempted to submit the form at least once
      setSubmitting(true);

      const isFormValid = await validateAllFields();
      const formData = getFormData();

      if (onSubmit) {
        await onSubmit(formData, isFormValid!);
      }

      if (isUnmounted.current === false) {
        setSubmitting(false);
      }

      return { data: formData, isValid: isFormValid! };
    },
    [validateAllFields, getFormData, onSubmit]
  );

  const subscribe: FormHook<T>['subscribe'] = useCallback(
    (handler) => {
      const subscription = getFormData$().subscribe((raw) => {
        if (!isUnmounted.current) {
          handler({ isValid, data: { raw, format: getFormData }, validate: validateAllFields });
        }
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
    [getFormData$, isValid, getFormData, validateAllFields]
  );

  /**
   * Reset all the fields of the form to their default values
   * and reset all the states to their original value.
   */
  const reset: FormHook<T>['reset'] = useCallback(
    (resetOptions = { resetValues: true }) => {
      const { resetValues = true } = resetOptions;
      const currentFormData = { ...getFormData$().value } as FormData;
      Object.entries(fieldsRefs.current).forEach(([path, field]) => {
        // By resetting the form, some field might be unmounted. In order
        // to avoid a race condition, we check that the field still exists.
        const isFieldMounted = fieldsRefs.current[path] !== undefined;
        if (isFieldMounted) {
          const fieldValue = field.reset({ resetValue: resetValues }) ?? currentFormData[path];
          currentFormData[path] = fieldValue;
        }
      });
      if (resetValues) {
        getFormData$().next(currentFormData as T);
      }

      setIsSubmitted(false);
      setSubmitting(false);
      setIsValid(undefined);
    },
    [getFormData$]
  );

  const form = useMemo<FormHook<T>>(() => {
    return {
      isSubmitted,
      isSubmitting,
      isValid,
      id,
      submit: submitForm,
      subscribe,
      setFieldValue,
      setFieldErrors,
      getFields,
      getFormData,
      getErrors,
      getFieldDefaultValue,
      reset,
      __options: formOptions,
      __getFormData$: getFormData$,
      __updateFormDataAt: updateFormDataAt,
      __readFieldConfigFromSchema: readFieldConfigFromSchema,
      __addField: addField,
      __removeField: removeField,
      __validateFields: validateFields,
    };
  }, [
    isSubmitted,
    isSubmitting,
    isValid,
    id,
    submitForm,
    subscribe,
    setFieldValue,
    setFieldErrors,
    getFields,
    getFormData,
    getErrors,
    getFieldDefaultValue,
    reset,
    formOptions,
    getFormData$,
    updateFormDataAt,
    readFieldConfigFromSchema,
    addField,
    removeField,
    validateFields,
  ]);

  return {
    form,
  };
}
