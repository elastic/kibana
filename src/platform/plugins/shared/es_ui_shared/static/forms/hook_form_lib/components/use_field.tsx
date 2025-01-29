/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';

import { FieldHook, FieldConfig, FormData } from '../types';
import { useFieldFromProps } from '../hooks';

export interface Props<T, FormType = FormData, I = T> {
  path: string;
  // @ts-expect-error upgrade typescript v4.9.5
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
  const { field, propsToForward } = useFieldFromProps<T, FormType, I>(props);

  const ComponentToRender = props.component ?? 'input';

  // Children prevails over anything else provided.
  if (props.children) {
    return props.children(field);
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
