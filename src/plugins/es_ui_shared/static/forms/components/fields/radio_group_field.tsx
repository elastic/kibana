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
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../hook_form_lib';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, any>;
  idAria?: string;
  [key: string]: any;
}

export const RadioGroupField = ({ field, euiFieldProps = {}, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      data-test-subj={rest['data-test-subj']}
      describedByIds={rest.idAria ? [rest.idAria] : undefined}
    >
      <EuiRadioGroup
        idSelected={field.value as string}
        options={[]}
        onChange={field.setValue}
        data-test-subj="input"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
