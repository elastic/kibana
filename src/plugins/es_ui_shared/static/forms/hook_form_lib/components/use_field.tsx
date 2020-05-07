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

export interface Props {
  path: string;
  config?: FieldConfig<any>;
  defaultValue?: unknown;
  component?: FunctionComponent<any> | 'input';
  componentProps?: Record<string, any>;
  readDefaultValueOnForm?: boolean;
  onChange?: (value: unknown) => void;
  children?: (field: FieldHook) => JSX.Element;
}

export const UseField = React.memo(
  ({
    path,
    config,
    defaultValue,
    component,
    componentProps,
    readDefaultValueOnForm = true,
    onChange,
    children,
  }: Props) => {
    const form = useFormContext();
    component = component === undefined ? 'input' : component;
    componentProps = componentProps === undefined ? {} : componentProps;

    if (typeof defaultValue === 'undefined' && readDefaultValueOnForm) {
      defaultValue = form.getFieldDefaultValue(path);
    }

    if (!config) {
      config = form.__readFieldConfigFromSchema(path);
    }

    // Don't modify the config object
    const configCopy =
      typeof defaultValue !== 'undefined' ? { ...config, defaultValue } : { ...config };

    if (!configCopy.path) {
      configCopy.path = path;
    } else {
      if (configCopy.path !== path) {
        throw new Error(
          `Field path mismatch. Got "${path}" but field config has "${configCopy.path}".`
        );
      }
    }

    const field = useField(form, path, configCopy, onChange);

    // Children prevails over anything else provided.
    if (children) {
      return children!(field);
    }

    if (component === 'input') {
      return (
        <input
          type={field.type}
          onChange={field.onChange}
          value={field.value as string}
          {...componentProps}
        />
      );
    }

    return component({ field, ...componentProps });
  }
);

/**
 * Get a <UseField /> component providing some common props for all instances.
 * @param partialProps Partial props to apply to all <UseField /> instances
 */
export const getUseField = (partialProps: Partial<Props>) => (props: Partial<Props>) => {
  const componentProps = { ...partialProps, ...props } as Props;
  return <UseField {...componentProps} />;
};
