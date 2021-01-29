/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FunctionComponent } from 'react';

import { FieldHook, FieldConfig, FormData } from '../types';
import { useField } from '../hooks';
import { useFormContext } from '../form_context';

export interface Props<T, FormType = FormData, I = T> {
  path: string;
  config?: FieldConfig<T, FormType, I>;
  defaultValue?: T;
  component?: FunctionComponent<any>;
  componentProps?: Record<string, any>;
  readDefaultValueOnForm?: boolean;
  onChange?: (value: I) => void;
  children?: (field: FieldHook<T, I>) => JSX.Element | null;
  [key: string]: any;
}

function UseFieldComp<T = unknown, FormType = FormData, I = T>(props: Props<T, FormType, I>) {
  const {
    path,
    config,
    defaultValue,
    component,
    componentProps,
    readDefaultValueOnForm = true,
    onChange,
    children,
    ...rest
  } = props;

  const form = useFormContext<FormType>();
  const ComponentToRender = component ?? 'input';
  const propsToForward = { ...componentProps, ...rest };

  const fieldConfig: FieldConfig<T, FormType, I> & { initialValue?: T } =
    config !== undefined
      ? { ...config }
      : ({
          ...form.__readFieldConfigFromSchema(path),
        } as Partial<FieldConfig<T, FormType, I>>);

  if (defaultValue !== undefined) {
    // update the form "defaultValue" ref object so when/if we reset the form we can go back to this value
    form.__updateDefaultValueAt(path, defaultValue);

    // Use the defaultValue prop as initial value
    fieldConfig.initialValue = defaultValue;
  } else {
    if (readDefaultValueOnForm) {
      // Read the field initial value from the "defaultValue" object passed to the form
      fieldConfig.initialValue =
        (form.__getFieldDefaultValue(path) as T) ?? fieldConfig.defaultValue;
    }
  }

  const field = useField<T, FormType, I>(form, path, fieldConfig, onChange);

  // Children prevails over anything else provided.
  if (children) {
    return children!(field);
  }

  if (ComponentToRender === 'input') {
    return (
      <ComponentToRender
        type={field.type}
        onChange={field.onChange}
        value={(field.value as unknown) as string}
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
