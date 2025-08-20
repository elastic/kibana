/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import type { SelectableEntry } from '@kbn/unified-histogram';
import { ToolbarSelector } from '@kbn/unified-histogram';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import { FIELD_VALUE_SEPARATOR } from '../../../common/utils/value_formatters/constants';
import { useDimensionsQuery } from '../../hooks';

interface ValuesFilterProps {
  selectedDimensions: string[];
  selectedValues: string[];
  indices?: string[];
  disabled?: boolean;
  timeRange?: {
    from?: string;
    to?: string;
  };
  onChange: (values: string[]) => void;
}
export const ValuesSelector = ({
  selectedDimensions,
  selectedValues,
  onChange,
  timeRange,
  disabled = false,
  indices = [],
}: ValuesFilterProps) => {
  const {
    data: values = [],
    isLoading,
    error,
  } = useDimensionsQuery({
    dimensions: selectedDimensions,
    indices,
    from: timeRange?.from,
    to: timeRange?.to,
  });

  // Convert values to EuiSelectable options with group labels
  const options: SelectableEntry[] = useMemo(() => {
    const groupedValues = new Map<string, string[]>();
    const selectedSet = new Set(selectedValues);

    values.forEach(({ value, field }) => {
      const arr = groupedValues.get(field) ?? [];
      arr.push(value);
      groupedValues.set(field, arr);
    });

    return Array.from(groupedValues.entries()).flatMap<SelectableEntry>(([field, fieldValues]) => [
      { label: field, isGroupLabel: true, value: field },
      ...fieldValues.map<SelectableEntry>((value) => {
        const key = `${field}${FIELD_VALUE_SEPARATOR}${value}`;
        return {
          value,
          label: value,
          checked: selectedSet.has(key) ? 'on' : undefined,
          key,
        };
      }),
    ]);
  }, [values, selectedValues]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry[] | undefined) => {
      const newSelectedValues = chosenOption
        ?.filter((option) => !option.isGroupLabel && option.key)
        .map((option) => option.key!);

      onChange(newSelectedValues ?? []);
    },
    [onChange]
  );

  const buttonLabel = useMemo(() => {
    if (selectedValues.length === 0) {
      return (
        <FormattedMessage
          id="metricsExperience.valuesSelector.valuesSelectorButtonLabel"
          defaultMessage="Filter by values"
        />
      );
    }
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="metricsExperience.valuesSelector.valuesSelectorButtonLabelWithSelection"
            defaultMessage="Values"
            values={{
              count: selectedValues.length,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{selectedValues.length}</EuiNotificationBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [selectedValues]);

  return (
    <ToolbarSelector
      data-test-subj="metricsExperienceBreakdownSelector"
      data-selected-value={selectedDimensions}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={({ option, normalizedSearchValue }) => {
        return 'name' in option
          ? String(option.name ?? '').includes(normalizedSearchValue)
          : option.label.includes(normalizedSearchValue);
      }}
      anchorPosition="downCenter"
      options={options}
      singleSelection={false}
      onChange={handleChange}
    />
  );
};
