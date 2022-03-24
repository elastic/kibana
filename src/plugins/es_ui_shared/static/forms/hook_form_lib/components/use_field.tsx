/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useMemo, useEffect } from 'react';

import { FieldHook, FieldConfig, FormData, FieldValidationData } from '../types';
import { useField, InternalFieldConfig } from '../hooks';
import { useFormContext } from '../form_context';

export interface Props<T, FormType = FormData, I = T> {
  path: string;
  config?: FieldConfig<T, FormType, I>;
  defaultValue?: T;
  component?: FunctionComponent<any>;
  componentProps?: Record<string, any>;
  readDefaultValueOnForm?: boolean;
  /**
   * Use this prop to pass down dynamic data **asynchronously** to your validators.
   * Your validator accesses the dynamic data by resolving the provider() Promise.
   * ```typescript
   * validator: ({ customData }) => {
   *   // Wait until a value is sent to the "validationData$" Observable
   *   const dynamicData = await customData.provider();
   * }
   * ```
   */
  validationDataProvider?: () => Promise<unknown>;
  /**
   * Use this prop to pass down dynamic data to your validators. The validation data
   * is then accessible in your validator inside the `customData.value` property.
   *
   * ```typescript
   * validator: ({ customData: { value: dynamicData } }) => {
   *   // Validate with the dynamic data
   *   if (dynamicData) { .. }
   * }
   * ```
   */
  validationData?: unknown;
  onChange?: (value: I) => void;
  onError?: (errors: string[] | null) => void;
  children?: (field: FieldHook<T, I>) => JSX.Element | null;
  [key: string]: any;
}

function UseFieldComp<T = unknown, FormType = FormData, I = T>(props: Props<T, FormType, I>) {
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

  const ComponentToRender = component ?? 'input';
  const propsToForward = { ...componentProps, ...rest };

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
    if (defaultValue !== undefined) {
      // Update the form "defaultValue" ref object.
      // This allows us to reset the form and put back the defaultValue of each field
      __updateDefaultValueAt(path, defaultValue);
    }
  }, [path, defaultValue, __updateDefaultValueAt]);

  // Children prevails over anything else provided.
  if (children) {
    return children(field);
  }

  if (ComponentToRender === 'input') {
    return (
      <ComponentToRender
        type={field.type}
        onChange={field.onChange}
        value={field.value as unknown as string}
        {...propsToForward}
      />
    );
  }

  return <ComponentToRender {...{ field, ...propsToForward }} />;
}

export const UseField = React.memo(UseFieldComp) as typeof UseFieldComp;

/**
 * Get a <UseField /> component providing some common props for all instances.
 * @param partialProps Partial props to apply to all <UseField /> instances
 *
 * @example
 *
 * // All the "MyUseField" are TextFields
 * const MyUseField = getUseField({ component: TextField });
 *
 * // JSX
 * <Form>
 *   <MyUseField path="textField_0" />
 *   <MyUseField path="textField_1" />
 *   <MyUseField path="textField_2" />
 * </Form>
 */
export function getUseField<T1 = unknown, FormType1 = FormData, I1 = T1>(
  partialProps: Partial<Props<T1, FormType1, I1>>
) {
  return function <T2 = T1, FormType2 = FormType1, I2 = I1>(
    props: Partial<Props<T2, FormType2, I2>>
  ) {
    const componentProps = { ...partialProps, ...props } as Props<T2, FormType2, I2>;
    return <UseField<T2, FormType2, I2> {...componentProps} />;
  };
}
