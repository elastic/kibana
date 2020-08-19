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

import React, { FunctionComponent } from 'react';

import { FieldHook, FieldConfig } from '../types';
import { useField } from '../hooks';
import { useFormContext } from '../form_context';

export interface Props<T> {
  path: string;
  config?: FieldConfig<any, T>;
  defaultValue?: T;
  component?: FunctionComponent<any> | 'input';
  componentProps?: Record<string, any>;
  readDefaultValueOnForm?: boolean;
  onChange?: (value: T) => void;
  children?: (field: FieldHook<T>) => JSX.Element;
  [key: string]: any;
}

function UseFieldComp<T = unknown>(props: Props<T>) {
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

  const form = useFormContext();
  const componentToRender = component ?? 'input';
  // For backward compatibility we merge the "componentProps" prop into the "rest"
  const propsToForward =
    componentProps !== undefined ? { ...componentProps, ...rest } : { ...rest };

  const fieldConfig: FieldConfig<any, T> & { initialValue?: T } =
    config !== undefined
      ? { ...config }
      : ({
          ...form.__readFieldConfigFromSchema(path),
        } as Partial<FieldConfig<any, T>>);

  if (defaultValue !== undefined) {
    // update the form "defaultValue" ref object so when/if we reset the form we can go back to this value
    form.__updateDefaultValueAt(path, defaultValue);

    // Use the defaultValue prop as initial value
    fieldConfig.initialValue = defaultValue;
  } else {
    if (readDefaultValueOnForm) {
      // Read the field initial value from the "defaultValue" object passed to the form
      fieldConfig.initialValue = (form.getFieldDefaultValue(path) as T) ?? fieldConfig.defaultValue;
    }
  }

  if (!fieldConfig.path) {
    (fieldConfig.path as any) = path;
  } else {
    if (fieldConfig.path !== path) {
      throw new Error(
        `Field path mismatch. Got "${path}" but field config has "${fieldConfig.path}".`
      );
    }
  }

  const field = useField<T>(form, path, fieldConfig, onChange);

  // Children prevails over anything else provided.
  if (children) {
    return children!(field);
  }

  if (componentToRender === 'input') {
    return (
      <input
        type={field.type}
        onChange={field.onChange}
        value={(field.value as unknown) as string}
        {...propsToForward}
      />
    );
  }

  return componentToRender({ field, ...propsToForward });
}

export const UseField = React.memo(UseFieldComp) as typeof UseFieldComp;

/**
 * Get a <UseField /> component providing some common props for all instances.
 * @param partialProps Partial props to apply to all <UseField /> instances
 */
export function getUseField<T1 = unknown>(partialProps: Partial<Props<T1>>) {
  return function <T2 = T1>(props: Partial<Props<T2>>) {
    const componentProps = { ...partialProps, ...props } as Props<T2>;
    return <UseField<T2> {...componentProps} />;
  };
}
