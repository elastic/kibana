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
import { toInt } from '../field_formatters';

const DEFAULT_ERROR_DISPLAY_TIMEOUT = 500;

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
    type = 'text',
    validations = [],
    formatters = [],
    fieldsToValidateOnChange = [path],
    isValidationAsync = false,
  } = config;

  const [value, setStateValue] = useState(
    typeof defaultValue === 'function' ? defaultValue() : defaultValue
  );
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isPristine, setPristine] = useState(true);
  const [isValidating, setValidating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const validateCounter = useRef(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Add default formatter for numeric field, if none provided
  if (type === 'number' && !formatters.length) {
    formatters.push(toInt);
  }

  const filterErrors = (_errors: ValidationError[], errorType = 'field'): ValidationError[] =>
    _errors.filter(error => {
      if (!{}.hasOwnProperty.call(error, 'type')) {
        return errorType !== 'field';
      }
      return error.type !== errorType;
    });

  const clearErrors: Field['clearErrors'] = (errorType = 'field') => {
    setErrors(previousErrors => filterErrors(previousErrors, errorType));
  };

  const validate: Field['validate'] = async (validationData = {}) => {
    let { formData, value: valueToValidate } = validationData;
    formData = formData || form.getFormData({ unflatten: false });
    valueToValidate = valueToValidate || value;

    setValidating(true);

    // By the time our validate function has reached completion, it’s possible
    // that validate() will have been called again. If this is the case, we need
    // to ignore the results of this invocation and only use the results of
    // the most recent invocation to update the error state for a field
    const validateIteration = ++validateCounter.current;

    const validationErrors: ValidationError[] = [];
    let skip = false;

    const validateFieldAsync = async ({ validator, exitOnFail }: ValidationConfig) => {
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

    const validateFieldSync = ({ validator, exitOnFail }: ValidationConfig) => {
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

    // Sequencially execute all the validations for the field
    if (isValidationAsync) {
      clearErrors();

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

  const runFormatters = (input: unknown): unknown => {
    if (typeof input === 'string' && input.trim() === '') {
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
    }, form.options.errorDisplayDelay);
  };

  /**
   * Handler for the form input events change
   *
   * @param event Form input change event
   */
  const onChange: Field['onChange'] = event => {
    onValueChange();

    const newValue = {}.hasOwnProperty.call(event!.target, 'checked')
      ? event.target.checked
      : event.target.value;

    setStateValue(runFormatters(newValue));
  };

  const setValue: Field['setValue'] = newValue => {
    onValueChange();
    setStateValue(runFormatters(newValue));
  };

  const getErrorsMessages: Field['getErrorsMessages'] = (errorType = 'field') => {
    const errorMessages = errors.reduce((messages, error) => {
      if (
        error.type === errorType ||
        (errorType === 'field' && !{}.hasOwnProperty.call(error, 'type'))
      ) {
        return messages ? `${messages}, ${error.message}` : (error.message as string);
      }
      return messages;
    }, '');

    return errorMessages ? errorMessages : null;
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
    getErrorsMessages,
  };

  form.addField(field);

  return field;
};

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

  const getFormData: Form['getFormData'] = (getDataOptions = { unflatten: true }) =>
    getDataOptions.unflatten
      ? (unflattenObject(
          mapFormFields(stripEmptyFields(fieldsRefs.current), field => field.value)
        ) as T)
      : Object.entries(fieldsRefs.current).reduce(
          (acc, [key, field]) => ({ ...acc, [key]: field.value }),
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
   * Helper to remove all fields whose path starts with
   * the pattern provided.
   * Usefull for removing all the elements of an Array
   * for example (e.g pattern = "colors." => "colors.0, colors.1" would be removed.)
   * @param pattern The path pattern to match
   */
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
