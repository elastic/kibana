/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FormValues } from '../types';

interface GroupBySelectProps {
  columns: Array<{ name: string; type: string }>;
}

export const GroupBySelect: React.FC<GroupBySelectProps> = ({ columns }) => {
  const { control, setValue } = useFormContext<FormValues>();
  const options = useMemo(
    () => columns.map((col) => ({ label: col.name, value: col.name })),
    [columns]
  );
  const columnNames = useMemo(() => new Set(columns.map((col) => col.name)), [columns]);
  const groupByRowId = 'ruleV2FormGroupByField';

  // Watch for changes to groupingKey
  const currentGroupingKey = useWatch({ control, name: 'groupingKey' });

  // When columns change, filter out any invalid selections
  useEffect(() => {
    if (currentGroupingKey && currentGroupingKey.length > 0 && columnNames.size > 0) {
      const validValues = currentGroupingKey.filter((val) => columnNames.has(val));
      if (validValues.length !== currentGroupingKey.length) {
        setValue('groupingKey', validValues);
      }
    }
  }, [columnNames, currentGroupingKey, setValue]);

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
