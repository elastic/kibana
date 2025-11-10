/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiText,
} from '@elastic/eui';
import type { TimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';
import { useDimensionsQuery } from '../../hooks';
import { ClearAllSection } from './clear_all_section';
import {
  MAX_VALUES_SELECTIONS,
  METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';

export interface ValuesFilterProps {
  selectedDimensions: string[];
  selectedValues: string[];
  indices?: string[];
  disabled?: boolean;
  timeRange: TimeRange;

  fullWidth?: boolean;
  onChange: (values: string[]) => void;
  onClear: () => void;
}
export const ValuesSelector = ({
  selectedDimensions,
  selectedValues,
  onChange,
  timeRange,
  fullWidth = false,
  disabled = false,
  indices = [],
  onClear,
}: ValuesFilterProps) => {
  const {
    data: values = [],
    isLoading,
    error,
  } = useDimensionsQuery({
    dimensions: selectedDimensions,
    indices,
    from: timeRange.from,
    to: timeRange.to,
  });
  // Convert values to EuiSelectable options with group labels
  const options: SelectableEntry[] = useMemo(() => {
    const groupedValues = new Map<string, string[]>();
    const selectedSet = new Set(selectedValues);
    const isAtMaxLimit = selectedValues.length >= MAX_VALUES_SELECTIONS;

    values.forEach(({ value, field }) => {
      const arr = groupedValues.get(field) ?? [];
      arr.push(value);
      groupedValues.set(field, arr);
    });

    return Array.from(groupedValues.entries()).flatMap<SelectableEntry>(([field, fieldValues]) => [
      { label: field, isGroupLabel: true, value: field },
      ...fieldValues.map<SelectableEntry>((value) => {
        const key = `${field}${FIELD_VALUE_SEPARATOR}${value}`;
        const isSelected = selectedSet.has(key);
        const isDisabledByLimit = !isSelected && isAtMaxLimit;

        return {
          value,
          label: value,
          checked: isSelected ? 'on' : undefined,
          disabled: isDisabledByLimit,
          key,
        };
      }),
    ]);
  }, [values, selectedValues]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry[]) => {
      const newSelectedValues = chosenOption
        ?.filter((option) => !option.isGroupLabel && option.key)
        .map((option) => option.key!);

      // Enforce the maximum limit
      const limitedSelection = (newSelectedValues ?? []).slice(0, MAX_VALUES_SELECTIONS);
      onChange(limitedSelection);
    },
    [onChange]
  );

  const buttonLabel = useMemo(() => {
    const count = selectedValues.length;

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-start;
          `}
        >
          {count > 0 ? (
            <FormattedMessage
              id="metricsExperience.valuesSelector.valuesSelectorButtonLabelWithSelection"
              defaultMessage="Values"
            />
          ) : (
            <FormattedMessage
              id="metricsExperience.valuesSelector.valuesSelectorButtonLabel"
              defaultMessage="Filter by values"
            />
          )}
        </EuiFlexItem>

        {count > 0 && (
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge>{count}</EuiNotificationBadge>
          </EuiFlexItem>
        )}

        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [isLoading, selectedValues.length]);

  const popoverContentBelowSearch = useMemo(() => {
    const isAtMaxLimit = selectedValues.length >= MAX_VALUES_SELECTIONS;
    const statusMessage = isAtMaxLimit
      ? i18n.translate('metricsExperience.valuesSelector.maxLimitStatusMessage', {
          defaultMessage: 'Maximum of {maxValues} values selected ({count}/{maxValues})',
          values: { count: selectedValues.length, maxValues: MAX_VALUES_SELECTIONS },
        })
      : i18n.translate('metricsExperience.valuesSelector.selectedStatusMessage', {
          defaultMessage: '{count, plural, one {# value selected} other {# values selected}}',
          values: { count: selectedValues.length },
        });

    return (
      <ClearAllSection
        selectedOptionsLength={selectedValues.length}
        onClearAllAction={onClear}
        selectedOptionsMessage={statusMessage}
      />
    );
  }, [selectedValues.length, onClear]);

  if (error) {
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiIcon type="alert" color="danger" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="danger">
            <FormattedMessage
              id="metricsExperience.valuesSelector.errorLoadingValues"
              defaultMessage="Error loading values"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <ToolbarSelector
      data-test-subj={METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={selectedDimensions}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      singleSelection={false}
      hasArrow={!isLoading}
      onChange={handleChange}
      disabled={disabled}
      popoverContentBelowSearch={popoverContentBelowSearch}
      fullWidth={fullWidth}
    />
  );
};
