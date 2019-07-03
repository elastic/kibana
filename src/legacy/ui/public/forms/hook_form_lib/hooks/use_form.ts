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

import { Form, FieldConfig, FieldsMap, FormConfig } from '../types';
import { getAt, mapFormFields, unflattenObject } from '../utils';

const DEFAULT_ERROR_DISPLAY_TIMEOUT = 500;

export const useForm = <T = FormData>({
  onSubmit,
  schema,
  defaultValues = {},
  options = { errorDisplayDelay: DEFAULT_ERROR_DISPLAY_TIMEOUT, stripEmptyFields: true },
}: FormConfig<T>): { form: Form<T> } => {
  const [isSubmitted, setSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const fieldsRefs = useRef<FieldsMap>({});

  // -- HELPERS
  // ----------------------------------
  const fieldsToArray = () => Object.values(fieldsRefs.current);

  const stripEmptyFields = (fields: FieldsMap): FieldsMap => {
    if (options.stripEmptyFields) {
      return Object.entries(fields).reduce(
        (acc, [key, field]) => {
          if (field.value !== '') {
            acc[key] = field;
          }
          return acc;
        },
        {} as FieldsMap
      );
    }
    return fields;
  };

  // -- API
  // ----------------------------------
  const getFormData: Form['getFormData'] = (getDataOptions = { unflatten: true }) =>
    getDataOptions.unflatten
      ? (unflattenObject(
          mapFormFields(stripEmptyFields(fieldsRefs.current), field => field.getOutputValue())
        ) as T)
      : Object.entries(fieldsRefs.current).reduce(
          (acc, [key, field]) => ({
            ...acc,
            [key]: field.getOutputValue(),
          }),
          {}
        );

  const validateFields: Form['validateFields'] = async fieldNames => {
    const fieldsToValidate = fieldNames
      ? fieldNames.map(name => fieldsRefs.current[name]).filter(field => field !== undefined)
      : fieldsToArray().filter(field => field.isPristine);

    const formData = getFormData({ unflatten: false });

    await Promise.all(fieldsToValidate.map(field => field.validate({ formData })));

    const isFormValid = fieldsToArray().every(field => !field.errors.length && !field.isValidating);
    setIsValid(isFormValid);

    return isFormValid;
  };

  const addField: Form['addField'] = field => {
    fieldsRefs.current[field.path] = field;
  };

  const removeField: Form['removeField'] = _fieldNames => {
    const fieldNames = Array.isArray(_fieldNames) ? _fieldNames : [_fieldNames];
    fieldNames.forEach(name => delete fieldsRefs.current[name]);

    // Wait next tick to make sure all the fields have their
    // values updated after the DOM has been updated
    setTimeout(() => {
      validateFields();
    });
  };

  /**
   * Remove all fields whose path starts with the pattern provided.
   * Usefull for removing all the elements of an Array
   * for example (e.g pattern = "colors." => "colors.0, colors.1" would be removed.)
   *
   * @param pattern The path pattern to match
   */
  const removeFieldsStartingWith: Form['removeFieldsStartingWith'] = pattern => {
    Object.keys(fieldsRefs.current).forEach(key => {
      if (key.startsWith(pattern)) {
        delete fieldsRefs.current[key];
      }
    });

    // As removing a field implies that it is also removed from the DOM
    // we need to first wait for the the DOM to be updated _before_ validating the form fields.
    setTimeout(() => {
      validateFields();
    });
  };

  const getFields: Form['getFields'] = () => fieldsRefs.current;

  const setFieldValue: Form['setFieldValue'] = (fieldName, value) => {
    fieldsRefs.current[fieldName].setValue(value);
  };

  const setFieldErrors: Form['setFieldErrors'] = (fieldName, errors) => {
    fieldsRefs.current[fieldName].setErrors(errors);
  };

  const getDefaultValueField: Form['getDefaultValueField'] = fieldName =>
    getAt(fieldName, defaultValues, false);

  const readFieldConfigFromSchema: Form['readFieldConfigFromSchema'] = fieldName => {
    const config = (getAt(fieldName, schema ? schema : {}, false) as FieldConfig) || {};

    return config;
  };

  const onSubmitForm: Form['onSubmit'] = async e => {
    e.preventDefault();

    setSubmitting(true);
    setSubmitted(true); // User has attempted to submit the form at least once

    const isFormValid = await validateFields();
    await onSubmit(getFormData() as T, isFormValid);

    setSubmitting(false);
  };

  const form: Form<T> = {
    onSubmit: onSubmitForm,
    addField,
    removeField,
    removeFieldsStartingWith,
    getFields,
    setFieldValue,
    setFieldErrors,
    getDefaultValueField,
    readFieldConfigFromSchema,
    getFormData,
    validateFields,
    isSubmitted,
    isSubmitting,
    isValid,
    options,
  };

  return {
    form,
  };
};
