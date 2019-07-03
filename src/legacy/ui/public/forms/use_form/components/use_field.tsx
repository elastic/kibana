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

import React from 'react';

import { Form, Field as FieldType, FieldConfig } from '../types';
import { useField } from '../use_field';

interface Props {
  path: string;
  config?: FieldConfig<any>;
  defaultValue?: unknown;
  form: Form<any>;
  render?: (({ field }: { field: FieldType } & any) => JSX.Element) | 'input';
  renderProps?: any;
  children?: (field: FieldType) => JSX.Element;
}

export const UseField = ({
  path,
  config,
  form,
  defaultValue,
  render = 'input',
  renderProps = {},
  children,
}: Props) => {
  if (!config) {
    config = form.readFieldConfigFromSchema(path);
  }

  const _defaultValue =
    typeof defaultValue !== 'undefined' ? defaultValue : form.getDefaultValueField(path);

  // Don't modify the config object
  const configCopy =
    typeof _defaultValue !== 'undefined'
      ? { ...config, defaultValue: _defaultValue }
      : { ...config };

  if (!configCopy.path) {
    configCopy.path = path;
  } else {
    if (configCopy.path !== path) {
      throw new Error(
        `Field path mismatch. Got "${path}" but field config has "${configCopy.path}".`
      );
    }
  }

  const field = useField(form, path, configCopy);

  if (children) {
    return children!(field);
  }

  if (render === 'input') {
    return (
      <input
        type={field.type}
        onChange={field.onChange}
        value={field.value as string}
        {...renderProps}
      />
    );
  }

  return render({ field, ...renderProps });
};
