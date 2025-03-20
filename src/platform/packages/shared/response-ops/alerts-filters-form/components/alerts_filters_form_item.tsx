/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select/super_select_item';
import { FormattedMessage } from '@kbn/i18n-react';
import { alertsFilters } from '../filters';
import { AlertsFilterComponentType, AlertsFiltersFormItemType } from '../types';

export interface AlertsFiltersFormItemProps<T> {
  type?: AlertsFiltersFormItemType;
  onTypeChange: (newFilterType: AlertsFiltersFormItemType) => void;
  value?: T;
  onValueChange: (newFilterValue: T) => void;
}

const options: Array<EuiSuperSelectOption<AlertsFiltersFormItemType>> = Object.values(
  alertsFilters
).map((filterMeta) => ({
  value: filterMeta.id,
  dropdownDisplay: filterMeta.displayName,
  inputDisplay: filterMeta.displayName,
}));

export const AlertsFiltersFormItem = <T,>({
  type,
  onTypeChange,
  value,
  onValueChange,
}: AlertsFiltersFormItemProps<T>) => {
  const filter = useMemo(() => {
    if (!type) {
      return null;
    }
    const FilterComponent = alertsFilters[type].component as AlertsFilterComponentType<T>;
    return <FilterComponent value={value} onChange={onValueChange} />;
  }, [type, value, onValueChange]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('alertsFiltersForm.formItem.label', {
          defaultMessage: 'Filter by',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            <FormattedMessage id="alertsFiltersForm.formItem.optional" defaultMessage="Optional" />
          </EuiText>
        }
        fullWidth
      >
        <EuiSuperSelect
          options={options}
          valueOfSelected={type}
          onChange={onTypeChange}
          fullWidth
        />
      </EuiFormRow>
      {filter}
    </>
  );
};
