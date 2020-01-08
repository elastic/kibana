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

import { useState, useRef } from 'react';
import { get } from 'lodash';

import { FormHook, FormData, FieldConfig, FieldsMap, FormConfig } from '../types';
import { mapFormFields, flattenObject, unflattenObject, Subject } from '../lib';

const DEFAULT_ERROR_DISPLAY_TIMEOUT = 500;
const DEFAULT_OPTIONS = {
  errorDisplayDelay: DEFAULT_ERROR_DISPLAY_TIMEOUT,
  stripEmptyFields: true,
};

interface UseFormReturn<T extends object> {
  form: FormHook<T>;
}

export function useForm<T extends object = FormData>(
  formConfig: FormConfig<T> | undefined = {}
): UseFormReturn<T> {
  const {
    onSubmit,
    schema,
    defaultValue = {},
    serializer = (data: any) => data,
    deserializer = (data: any) => data,
    options = {},
  } = formConfig;
  const formOptions = { ...DEFAULT_OPTIONS, ...options };
  const defaultValueDeserialized =
    Object.keys(defaultValue).length === 0 ? defaultValue : deserializer(defaultValue);
  const [isSubmitted, setSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const fieldsRefs = useRef<FieldsMap>({});

  // formData$ is an observable we can subscribe to in order to receive live
  // update of the raw form data. As an observable it does not trigger any React
  // render().
  // The <FormDataProvider> component is the one in charge of reading this observable
  // and updating its state to trigger the necessary view render.
  const formData$ = useRef<Subject<T>>(new Subject<T>(flattenObject(defaultValue) as T));

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

  const updateFormDataAt: FormHook<T>['__updateFormDataAt'] = (path, value) => {
    const currentFormData = formData$.current.value;
    formData$.current.next({ ...currentFormData, [path]: value });
    return formData$.current.value;
  };

  /**
   * When a field value changes, validateFields() is called with the field name + any other fields
   * declared in the "fieldsToValidateOnChange" (see the field config).
   *
   * When this method is called _without_ providing any fieldNames, we only need to validate fields that are pristine
   * as the fields that are dirty have already been validated when their value changed.
   */
  const validateFields: FormHook<T>['__validateFields'] = async fieldNames => {
    const fieldsToValidate = fieldNames
      ? fieldNames.map(name => fieldsRefs.current[name]).filter(field => field !== undefined)
      : fieldsToArray().filter(field => field.isPristine); // only validate fields that haven't been changed

    const formData = getFormData({ unflatten: false });

    await Promise.all(fieldsToValidate.map(field => field.validate({ formData })));

    const isFormValid = fieldsToArray().every(
      field => field.getErrorsMessages() === null && !field.isValidating
    );
    setIsValid(isFormValid);

    return isFormValid;
  };

  const addField: FormHook<T>['__addField'] = field => {
    fieldsRefs.current[field.path] = field;

    // Only update the formData if the path does not exist (it is the _first_ time
    // the field is added), to avoid entering an infinite loop when the form is re-rendered.
    if (!{}.hasOwnProperty.call(formData$.current.value, field.path)) {
      updateFormDataAt(field.path, field.__serializeOutput());
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
  };

  const setFieldValue: FormHook<T>['setFieldValue'] = (fieldName, value) => {
    fieldsRefs.current[fieldName].setValue(value);
  };

  const setFieldErrors: FormHook<T>['setFieldErrors'] = (fieldName, errors) => {
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
      setSubmitted(true); // User has attempted to submit the form at least once
    }
    setSubmitting(true);

    const isFormValid = await validateFields();
    const formData = serializer(getFormData() as T);

    if (onSubmit) {
      await onSubmit(formData, isFormValid);
    }

    setSubmitting(false);

    return { data: formData, isValid: isFormValid };
  };

  const form: FormHook<T> = {
    isSubmitted,
    isSubmitting,
    isValid,
    submit: submitForm,
    setFieldValue,
    setFieldErrors,
    getFields,
    getFormData,
    getFieldDefaultValue,
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
