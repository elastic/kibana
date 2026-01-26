/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { Controller } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface GroupBySelectProps {
  control: any;
  fields: Array<{ name: string; type: string }>;
}

export const GroupBySelect: React.FC<GroupBySelectProps> = ({ control, fields }) => {
  const options = fields.map((f) => ({ label: f.name, value: f.name }));
  const groupByRowId = 'ruleV2FormGroupByField';

  return (
    <EuiFormRow
      id={groupByRowId}
      label={i18n.translate('xpack.esqlRuleForm.groupingKeyLabel', {
        defaultMessage: 'Group By',
      })}
    >
      <Controller
        name="groupingKey"
        control={control}
        render={({ field }) => {
          const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));
          return (
            <EuiComboBox
              id={groupByRowId}
              options={options}
              selectedOptions={selectedOptions}
              onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
              onCreateOption={(searchValue) => {
                field.onChange([...(field.value ?? []), searchValue]);
              }}
              isClearable={true}
            />
          );
        }}
      />
    </EuiFormRow>
  );
};
