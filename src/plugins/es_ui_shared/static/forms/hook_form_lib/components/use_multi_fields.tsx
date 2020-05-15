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

import { UseField, Props as UseFieldProps } from './use_field';
import { FieldHook } from '../types';

type FieldsArray = Array<{ id: string } & Omit<UseFieldProps, 'children'>>;

interface Props {
  fields: { [key: string]: Omit<UseFieldProps, 'children'> };
  children: (fields: { [key: string]: FieldHook }) => JSX.Element;
}

export const UseMultiFields = ({ fields, children }: Props) => {
  const fieldsArray = Object.entries(fields).reduce(
    (acc, [fieldId, field]) => [...acc, { id: fieldId, ...field }],
    [] as FieldsArray
  );

  const hookFields: { [key: string]: FieldHook } = {};

  const renderField = (index: number) => {
    const { id } = fieldsArray[index];
    return (
      <UseField {...fields[id]}>
        {field => {
          hookFields[id] = field;
          return index === fieldsArray.length - 1 ? children(hookFields) : renderField(index + 1);
        }}
      </UseField>
    );
  };

  if (!Boolean(fieldsArray.length)) {
    return null;
  }

  return renderField(0);
};
