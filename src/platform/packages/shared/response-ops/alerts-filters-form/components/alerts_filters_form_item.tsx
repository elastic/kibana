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
import type { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select/super_select_item';
import { alertsFiltersMetadata } from '../filters';
import { AlertsFilterComponentType, AlertsFiltersFormItemType } from '../types';
import { FORM_ITEM_FILTER_BY_LABEL, FORM_ITEM_OPTIONAL_CAPTION } from '../translations';

export interface AlertsFiltersFormItemProps<T> {
  type?: AlertsFiltersFormItemType;
  onTypeChange: (newFilterType: AlertsFiltersFormItemType) => void;
  value?: T;
  onValueChange: (newFilterValue: T) => void;
  isDisabled?: boolean;
}

const options: Array<EuiSuperSelectOption<AlertsFiltersFormItemType>> = Object.values(
  alertsFiltersMetadata
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
  isDisabled = false,
}: AlertsFiltersFormItemProps<T>) => {
  const filter = useMemo(() => {
    if (!type) {
      return null;
    }
    const FilterComponent = alertsFiltersMetadata[type].component as AlertsFilterComponentType<T>;
    return <FilterComponent value={value} onChange={onValueChange} isDisabled={isDisabled} />;
  }, [type, value, onValueChange, isDisabled]);

  return (
    <>
      <EuiFormRow
        label={FORM_ITEM_FILTER_BY_LABEL}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {FORM_ITEM_OPTIONAL_CAPTION}
          </EuiText>
        }
        fullWidth
        isDisabled={isDisabled}
      >
        <EuiSuperSelect
          options={options}
          valueOfSelected={type}
          onChange={onTypeChange}
          disabled={isDisabled}
          fullWidth
        />
      </EuiFormRow>
      {filter}
    </>
  );
};
