/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React from 'react';
import _ from 'lodash';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSelect, EuiTextArea } from '@elastic/eui';
import { QueryRule, QueryRuleSeverity } from '@logrhythm/nm-web-shared/services/query_rules';

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
