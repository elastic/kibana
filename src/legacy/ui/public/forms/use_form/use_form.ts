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
  FieldsMap,
  FormConfig,
  ValidationConfig,
  ValidationError,
} from './types';
import { getAt, mapFormFields, unflattenObject } from './utils';

const DEFAULT_ERROR_DISPLAY_TIMEOUT = 500;

export const useField = (form: Form, path: string, config: FieldConfig = {}) => {
  const {
    defaultValue = '',
    label = '',
    validations = [],
    fieldsToValidateOnChange = [path],
    isValidationAsync = false,
  } = config;

  const [value, setValue] = useState(
    typeof defaultValue === 'function' ? defaultValue() : defaultValue
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPristine, setPristine] = useState(true);
  const [isValidating, setValidating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const validateCounter = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const validate: Field['validate'] = async (formData: any) => {
    setValidating(true);

    // By the time our validate function has reached completion, it’s possible
    // that validate() will have been called again. If this is the case, we need
    // to ignore the results of this invocation and only use the results of
    // the most recent invocation to update the error state for a field
    const validateIteration = ++validateCounter.current;

    const validationErrors: ValidationError[] = [];
    let skip = false;

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

    const validateFieldAsync = async ({ validator, exitOnFail }: ValidationConfig) => {
      if (skip) {
        return;
      }
      let validationResult;

      try {
        validationResult = await validator({
          value: (formData[name] as unknown) as string,
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

    const validateFieldSync = ({ validator, exitOnFail }: ValidationConfig) => {
      if (skip) {
        return;
      }
      let validationResult;

      try {
        validationResult = validator({
          value: (value as unknown) as string,
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
    if (isValidationAsync) {
      await validations.reduce(
        (promise, validation) =>
          promise.then(async () => {
            const validationResult = await validateFieldAsync(validation);

            if (validationResult) {
              const error = getValidationErrorWithMessage(validation, validationResult);
              validationErrors.push(error);
            }
          }),
        Promise.resolve()
      );
    } else {
      validations.forEach(validation => {
        const validationResult = validateFieldSync(validation);

        if (validationResult) {
          const error = getValidationErrorWithMessage(validation, validationResult);
          validationErrors.push(error);
        }
      });
    }

    if (validateIteration === validateCounter.current) {
      // This is the most recent invocation
      setValidating(false);
      setErrors(validationErrors);
    }

    const isFieldValid = validationErrors.length === 0;

    return isFieldValid;
  };

  const onChange: Field['onChange'] = e => {
    if (isPristine) {
      setPristine(false);
    }
    setIsUpdating(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setIsUpdating(false);
    }, form.options.errorDisplayDelay);

    if ({}.hasOwnProperty.call(e.target, 'checked')) {
      setValue(e.target.checked);
    } else {
      setValue(e.target.value);
    }
  };

  useEffect(
    () => {
      if (isPristine) {
        // Avoid validate on mount
        return;
      }
      form.validateFields(fieldsToValidateOnChange);
    },
    [value]
  );

  const field: Field = {
    path,
    label,
    value,
    errors,
    isPristine,
    isValidating,
    isUpdating,
    validate,
    setErrors,
    setValue,
    onChange,
  };

  form.addField(field);

  return field;
};

export const useForm = <T = FormData>({
  onSubmit,
  schema,
  defaultValues = {},
  options = { errorDisplayDelay: DEFAULT_ERROR_DISPLAY_TIMEOUT },
}: FormConfig<T>): { form: Form<T> } => {
  const [isSubmitted, setSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const fieldsRefs = useRef<FieldsMap>({});

  const fieldsToArray = () => Object.values(fieldsRefs.current);

  const getFormData: Form['getFormData'] = (getDataOptions = { unflatten: true }) =>
    getDataOptions.unflatten
      ? (unflattenObject(mapFormFields(fieldsRefs.current, field => field.value)) as T)
      : Object.entries(fieldsRefs.current).reduce(
          (acc, [key, field]) => ({ ...acc, [key]: field.value }),
          {}
        );

  const validateFields: Form['validateFields'] = async fieldNames => {
    const fieldsToValidate = fieldNames
      ? fieldNames.map(name => fieldsRefs.current[name])
      : fieldsToArray();

    const formData = getFormData({ unflatten: false });

    await Promise.all(fieldsToValidate.map(field => field.validate(formData)));

    const isFormValid = fieldsToArray().every(field => !field.errors.length);
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

  const removeFieldsStartingWith: Form['removeFieldsStartingWith'] = pattern => {
    Object.keys(fieldsRefs.current).forEach(key => {
      if (key.startsWith(pattern)) {
        delete fieldsRefs.current[key];
      }
    });

    // Wait next tick to make sure all the fields have their
    // values updated after the DOM has been updated
    setTimeout(() => {
      validateFields();
    });
  };

  const getFields = () => fieldsRefs.current;

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
