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

import { EuiDescribedFormGroup, EuiTitle } from '@elastic/eui';
import { Field as FieldType } from '../hook_form_lib';
import { Field } from './field';

interface Props {
  title: string | JSX.Element;
  description?: string | JSX.Element;
  field?: FieldType;
  fieldProps?: Record<string, any>;
  children?: React.ReactNode;
}

export const FormRow = ({ title, description, field, fieldProps = {}, children }: Props) => {
  // If a string is provided, create a default Euititle of size "m"
  const _title =
    typeof title === 'string' ? (
      <EuiTitle size="s">
        <h4>{title}</h4>
      </EuiTitle>
    ) : (
      title
    );

  if (!children && !field) {
    throw new Error('You need to provide either children or a field to the FormRow');
  }

  return (
    <EuiDescribedFormGroup title={_title} description={description} fullWidth>
      {children ? children : <Field field={field!} fieldProps={fieldProps} />}
    </EuiDescribedFormGroup>
  );
};
