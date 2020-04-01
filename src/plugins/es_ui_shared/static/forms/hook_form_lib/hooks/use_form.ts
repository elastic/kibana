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

import { useState, useRef, useEffect, useMemo } from 'react';
import { get } from 'lodash';

import { FormHook, FieldHook, FormData, FieldConfig, FieldsMap, FormConfig } from '../types';
import { mapFormFields, flattenObject, unflattenObject, Subject, Subscription } from '../lib';

const DEFAULT_ERROR_DISPLAY_TIMEOUT = 500;
const DEFAULT_OPTIONS = {
  errorDisplayDelay: DEFAULT_ERROR_DISPLAY_TIMEOUT,
  stripEmptyFields: true,
};

interface UseFormReturn<T extends FormData> {
  form: FormHook<T>;
}

export function useForm<T extends FormData = FormData>(
  formConfig: FormConfig<T> | undefined = {}
): UseFormReturn<T> {
  const {
    onSubmit,
    schema,
    serializer = (data: any) => data,
    deserializer = (data: any) => data,
    options = {},
  } = formConfig;

  const formDefaultValue =
    formConfig.defaultValue === undefined || Object.keys(formConfig.defaultValue).length === 0
      ? {}
      : Object.entries(formConfig.defaultValue as object)
          .filter(({ 1: value }) => value !== undefined)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const formOptions = { ...DEFAULT_OPTIONS, ...options };
  const defaultValueDeserialized = useMemo(() => deserializer(formDefaultValue), [
    formConfig.defaultValue,
  ]);

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
  const formData$ = useRef<Subject<T>>(new Subject<T>(flattenObject(formDefaultValue) as T));

  useEffect(() => {
    return () => {
      formUpdateSubscribers.current.forEach(subscription => subscription.unsubscribe());
      formUpdateSubscribers.current = [];
      isUnmounted.current = true;
    };
  }, []);

  // -- HELPERS
  // ----------------------------------
  const fieldsToArray = () => Object.values(fieldsRefs.current);

  const stripEmptyFields = (fields: FieldsMap): FieldsMap => {
    if (formOptions.stripEmptyFields) {
      return Object.entries(fields).reduce((acc, [key, field]) => {
        if (typeof field.value !== 'string' || field.value.trim() !== '') {
          acc[key] = field;
        }
        return acc;
      }, {} as FieldsMap);
    }
    return fields;
  };

  const updateFormDataAt: FormHook<T>['__updateFormDataAt'] = (path, value) => {
    const currentFormData = formData$.current.value;
    formData$.current.next({ ...currentFormData, [path]: value });
    return formData$.current.value;
  };

  // -- API
  // ----------------------------------
  const getFormData: FormHook<T>['getFormData'] = (getDataOptions = { unflatten: true }) =>
    getDataOptions.unflatten
      ? (unflattenObject(
          mapFormFields(stripEmptyFields(fieldsRefs.current), field => field.__serializeOutput())
        ) as T)
      : Object.entries(fieldsRefs.current).reduce(
          (acc, [key, field]) => ({
            ...acc,
            [key]: field.__serializeOutput(),
          }),
          {} as T
        );

  const getErrors: FormHook['getErrors'] = () => {
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
  };

  const isFieldValid = (field: FieldHook) =>
    field.getErrorsMessages() === null && !field.isValidating;

  const updateFormValidity = () => {
    const fieldsArray = fieldsToArray();
    const areAllFieldsValidated = fieldsArray.every(field => field.isValidated);

    if (!areAllFieldsValidated) {
      // If *not* all the fiels have been validated, the validity of the form is unknown, thus still "undefined"
      return undefined;
    }

    const isFormValid = fieldsArray.every(isFieldValid);

    setIsValid(isFormValid);
    return isFormValid;
  };

  const validateFields: FormHook<T>['__validateFields'] = async fieldNames => {
    const fieldsToValidate = fieldNames
      .map(name => fieldsRefs.current[name])
      .filter(field => field !== undefined);

    if (fieldsToValidate.length === 0) {
      // Nothing to validate
      return { areFieldsValid: true, isFormValid: true };
    }

    const formData = getFormData({ unflatten: false });
    await Promise.all(fieldsToValidate.map(field => field.validate({ formData })));

    const isFormValid = updateFormValidity();
    const areFieldsValid = fieldsToValidate.every(isFieldValid);

    return { areFieldsValid, isFormValid };
  };

  const validateAllFields = async (): Promise<boolean> => {
    const fieldsToValidate = fieldsToArray().filter(field => !field.isValidated);

    if (fieldsToValidate.length === 0) {
      // Nothing left to validate, all fields are already validated.
      return isValid!;
    }

    const { isFormValid } = await validateFields(fieldsToValidate.map(field => field.path));

    return isFormValid!;
  };

  const addField: FormHook<T>['__addField'] = field => {
    fieldsRefs.current[field.path] = field;

    if (!{}.hasOwnProperty.call(formData$.current.value, field.path)) {
      const fieldValue = field.__serializeOutput();
      updateFormDataAt(field.path, fieldValue);
    }
  };

  const removeField: FormHook<T>['__removeField'] = _fieldNames => {
    const fieldNames = Array.isArray(_fieldNames) ? _fieldNames : [_fieldNames];
    const currentFormData = { ...formData$.current.value } as FormData;

    fieldNames.forEach(name => {
      delete fieldsRefs.current[name];
      delete currentFormData[name];
    });

    formData$.current.next(currentFormData as T);

    /**
     * After removing a field, the form validity might have changed
     * (an invalid field might have been removed and now the form is valid)
     */
    updateFormValidity();
  };

  const setFieldValue: FormHook<T>['setFieldValue'] = (fieldName, value) => {
    if (fieldsRefs.current[fieldName] === undefined) {
      return;
    }
    fieldsRefs.current[fieldName].setValue(value);
  };

  const setFieldErrors: FormHook<T>['setFieldErrors'] = (fieldName, errors) => {
    if (fieldsRefs.current[fieldName] === undefined) {
      return;
    }
    fieldsRefs.current[fieldName].setErrors(errors);
  };

  const getFields: FormHook<T>['getFields'] = () => fieldsRefs.current;

  const getFieldDefaultValue: FormHook['getFieldDefaultValue'] = fieldName =>
    get(defaultValueDeserialized, fieldName);

  const readFieldConfigFromSchema: FormHook<T>['__readFieldConfigFromSchema'] = fieldName => {
    const config = (get(schema ? schema : {}, fieldName) as FieldConfig) || {};

    return config;
  };

  const submitForm: FormHook<T>['submit'] = async e => {
    if (e) {
      e.preventDefault();
    }

    if (!isSubmitted) {
      setIsSubmitted(true); // User has attempted to submit the form at least once
    }
    setSubmitting(true);

    const isFormValid = await validateAllFields();
    const formData = serializer(getFormData() as T);

    if (onSubmit) {
      await onSubmit(formData, isFormValid!);
    }

    setSubmitting(false);

    return { data: formData, isValid: isFormValid! };
  };

  const subscribe: FormHook<T>['subscribe'] = handler => {
    const format = () => serializer(getFormData() as T);

    const subscription = formData$.current.subscribe(raw => {
      if (!isUnmounted.current) {
        handler({ isValid, data: { raw, format }, validate: validateAllFields });
      }
    });

    formUpdateSubscribers.current.push(subscription);
    return subscription;
  };

  /**
   * Reset all the fields of the form to their default values
   * and reset all the states to their original value.
   */
  const reset: FormHook<T>['reset'] = (resetOptions = { resetValues: true }) => {
    const { resetValues = true } = resetOptions;
    const currentFormData = { ...formData$.current.value } as FormData;
    Object.entries(fieldsRefs.current).forEach(([path, field]) => {
      // By resetting the form, some field might be unmounted. In order
      // to avoid a race condition, we check that the field still exists.
      const isFieldMounted = fieldsRefs.current[path] !== undefined;
      if (isFieldMounted) {
        const fieldValue = field.reset({ resetValue: resetValues });
        currentFormData[path] = fieldValue;
      }
    });
    if (resetValues) {
      formData$.current.next(currentFormData as T);
    }

    setIsSubmitted(false);
    setSubmitting(false);
    setIsValid(undefined);
  };

  const form: FormHook<T> = {
    isSubmitted,
    isSubmitting,
    isValid,
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
    __formData$: formData$,
    __updateFormDataAt: updateFormDataAt,
    __readFieldConfigFromSchema: readFieldConfigFromSchema,
    __addField: addField,
    __removeField: removeField,
    __validateFields: validateFields,
  };

  return {
    form,
  };
}
