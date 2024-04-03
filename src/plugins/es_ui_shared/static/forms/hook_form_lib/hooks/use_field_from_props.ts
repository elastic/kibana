/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect } from 'react';
import { UseFieldProps } from '../components';
import { FieldHook, FieldConfig, FieldValidationData } from '../types';
import { useFormContext } from '../form_context';
import { useField, InternalFieldConfig } from './use_field';

/**
 * Hook to initialize a FieldHook based on Props passed to <UseField /> or <UseMultiFields />
 *
 * @param props The props passed to <UseField /> or <UseMultiFields />
 * @returns The field hook and props to forward to component to render for the field
 */

export const useFieldFromProps = <T, FormType, I>(
  props: UseFieldProps<T, FormType, I>
): { field: FieldHook<T, I>; propsToForward: { [x: string]: unknown } } => {
  // @ts-expect-error upgrade typescript v4.9.5
  const form = useFormContext<FormType>();
  const { getFieldDefaultValue, __readFieldConfigFromSchema, __updateDefaultValueAt } = form;

  const {
    path,
    config = __readFieldConfigFromSchema<T, FormType, I>(props.path),
    defaultValue,
    component,
    componentProps,
    readDefaultValueOnForm = true,
    onChange,
    onError,
    children,
    validationData,
    validationDataProvider,
    ...rest
  } = props;

  const initialValue = useMemo<T>(() => {
    // The initial value of the field.
    // Order in which we'll determine this value:
    // 1. The "defaultValue" passed through prop
    //    --> <UseField path="foo" defaultValue="bar" />
    // 2. A value declared in the "defaultValue" object passed to the form when initiating
    //    --> const { form } = useForm({ defaultValue: { foo: 'bar' } }))
    // 3. The "defaultValue" declared on the field "config". Either passed through prop or on the form schema
    //    a. --> <UseField path="foo" config={{ defaultValue: 'bar' }} />
    //    b. --> const formSchema = { foo: { defaultValue: 'bar' } }
    // 4. An empty string ("")

    if (defaultValue !== undefined) {
      return defaultValue; // defaultValue passed through props
    }

    let value: T | undefined;

    if (readDefaultValueOnForm) {
      // Check the "defaultValue" object passed to the form
      value = getFieldDefaultValue<T>(path);
    }

    if (value === undefined) {
      // Check the field "config" object (passed through prop or declared on the form schema)
      value = config?.defaultValue;
    }

    // If still undefined return an empty string
    return value === undefined ? ('' as unknown as T) : value;
  }, [defaultValue, path, config, readDefaultValueOnForm, getFieldDefaultValue]);

  // @ts-expect-error upgrade typescript v4.9.5
  const fieldConfig = useMemo<FieldConfig<T, FormType, I> & InternalFieldConfig<T>>(
    () => ({
      ...config,
      initialValue,
    }),
    [config, initialValue]
  );

  const fieldValidationData = useMemo<FieldValidationData>(
    () => ({
      validationData,
      validationDataProvider,
    }),
    [validationData, validationDataProvider]
  );

  const field = useField<T, FormType, I>(
    form,
    path,
    fieldConfig,
    onChange,
    onError,
    fieldValidationData
  );

  useEffect(() => {
    let needsCleanUp = false;

    if (defaultValue !== undefined) {
      needsCleanUp = true;
      // Update the form "defaultValue" ref object.
      // This allows us to reset the form and put back the defaultValue of each field
      __updateDefaultValueAt(path, defaultValue);
    }

    return () => {
      if (needsCleanUp) {
        __updateDefaultValueAt(path, undefined);
      }
    };
  }, [path, defaultValue, __updateDefaultValueAt]);

  const propsToForward = { ...componentProps, ...rest };

  return { field, propsToForward };
};
