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
import { i18n } from '@kbn/i18n';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import type { Dimension } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';
import { useDimensionsQuery } from '../../hooks';
import { ClearAllSection } from './clear_all_section';
import {
  MAX_VALUES_SELECTIONS,
  METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';

export interface ValuesFilterProps extends Pick<ChartSectionProps, 'timeRange'> {
  selectedDimensions: Dimension[];
  selectedValues: string[];
  indices?: string[];
  disabled?: boolean;
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
  const selectedDimensionNames = useMemo(
    () => selectedDimensions.map((d) => d.name),
    [selectedDimensions]
  );

  const {
    data: values = [],
    isLoading,
    error,
  } = useDimensionsQuery({
    dimensions: selectedDimensionNames,
    indices,
    from: timeRange?.from,
    to: timeRange?.to,
  });

  const groupedValues = useMemo(() => {
    const result = new Map<string, Array<string>>();
    values.forEach(({ value, field }) => {
      const arr = result.get(field) ?? [];
      arr.push(value);
      result.set(field, arr);
    });

    return result;
  }, [values]);

  // Convert values to EuiSelectable options with group labels
  const options: SelectableEntry[] = useMemo(() => {
    const selectedSet = new Set(selectedValues);
    const isAtMaxLimit = selectedValues.length >= MAX_VALUES_SELECTIONS;

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
  }, [groupedValues, selectedValues]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry[]) => {
      const newSelectedValues = chosenOption
        ?.filter((option) => !option.isGroupLabel && option.key)
        .map((option: SelectableEntry) => option.key!);

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
      data-selected-value={selectedDimensionNames}
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
