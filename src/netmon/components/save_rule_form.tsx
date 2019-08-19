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
import _ from 'lodash';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSelect, EuiTextArea } from '@elastic/eui';
import { QueryRule, QueryRuleSeverity } from '../services/query_rules';

const severityOptions = [
  {
    value: '',
    text: 'Choose Severity...',
  },
  {
    value: 'low',
    text: 'Low',
  },
  {
    value: 'medium',
    text: 'Medium',
  },
  {
    value: 'high',
    text: 'High',
  },
];

export type SaveRuleFormDataValidation = { [K in keyof QueryRule]: boolean };

export interface SaveRuleFormProps {
  value: QueryRule;
  onChange: (val: QueryRule) => void;
  validation: SaveRuleFormDataValidation | null;
}

export const SaveRuleForm = (props: SaveRuleFormProps) => {
  const { value, onChange, validation } = props;

  const nameInvalid = !!validation && !validation.id;
  const severityInvalid = !!validation && !validation.severity;
  const queryInvalid = !!validation && !validation.query;

  return (
    <EuiForm>
      <EuiFormRow label="Name" isInvalid={nameInvalid}>
        <EuiFieldText
          id="inputName"
          name="name"
          value={value.id}
          onChange={e => {
            onChange({
              ...value,
              id: e.target.value,
            });
          }}
          isInvalid={nameInvalid}
        />
      </EuiFormRow>
      <EuiFormRow label="Severity" isInvalid={severityInvalid}>
        <EuiSelect
          placeholder="Choose Severity..."
          options={severityOptions}
          value={value.severity}
          onChange={e => {
            onChange({
              ...value,
              severity: e.target.value as QueryRuleSeverity,
            });
          }}
          isInvalid={severityInvalid}
        />
      </EuiFormRow>
      <EuiFormRow label="Search" isInvalid={queryInvalid}>
        <EuiTextArea
          value={value.query}
          onChange={e => {
            onChange({
              ...value,
              query: e.target.value,
            });
          }}
          isInvalid={queryInvalid}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
