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
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiNotificationBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import type { Dimension } from '../../types';
import { FIELD_VALUE_SEPARATOR } from '../../common/constants';
import { ClearAllSection } from './clear_all_section';
import {
  MAX_VALUES_SELECTIONS,
  METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';
import { useExtractDimensionsValues } from '../../hooks/use_extract_dimensions_values';
import type { SpecsKey } from '../../common/utils';

export interface ValuesFilterProps {
  selectedDimensions: Dimension[];
  selectedValues: string[];
  indices?: string[];
  disabled?: boolean;
  fullWidth?: boolean;
  isLoading?: boolean;
  onChange: (items: { value: string; metricFields: Set<SpecsKey> }[]) => void;
  onClear: () => void;
}
export const ValuesSelector = ({
  selectedDimensions,
  selectedValues,
  onChange,
  fullWidth = false,
  disabled = false,
  isLoading: isFieldsLoading = false,
  indices = [],
  onClear,
}: ValuesFilterProps) => {
  const selectedDimensionNames = useMemo(
    () => selectedDimensions.map((d) => d.name),
    [selectedDimensions]
  );

  const valuesByDimensionName = useExtractDimensionsValues({
    indices,
    dimensionNames: selectedDimensionNames,
  });

  // Map: "field${SEPARATOR}value" → metricFieldKey
  const metricsByFieldValue = useMemo(() => {
    const result = new Map<string, Set<SpecsKey>>();
    for (const [field, values] of valuesByDimensionName.entries()) {
      for (const [value, metricFieldKey] of values.entries()) {
        result.set(`${field}${FIELD_VALUE_SEPARATOR}${value}`, metricFieldKey);
      }
    }
    return result;
  }, [valuesByDimensionName]);

  // Convert values to EuiSelectable options with group labels
  // Key format: field${SEPARATOR}value${SEPARATOR}metricFieldKey (3 parts for parseDimensionFilters)
  const options: SelectableEntry[] = useMemo(() => {
    const selectedSet = new Set(selectedValues);
    const isAtMaxLimit = selectedValues.length >= MAX_VALUES_SELECTIONS;

    return Array.from(valuesByDimensionName.entries()).flatMap<SelectableEntry>(
      ([field, values]) => [
        { label: field, isGroupLabel: true, value: field },
        ...Array.from(values.keys())
          .map<SelectableEntry>((value) => {
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
          })
          .sort((a, b) => a.label.localeCompare(b.label)),
      ]
    );
  }, [valuesByDimensionName, selectedValues]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry[]) => {
      const newSelectedValues = chosenOption
        ?.filter((option) => !option.isGroupLabel && option.key)
        .map((option: SelectableEntry) => {
          return {
            value: option.key!,
            metricFields: metricsByFieldValue.get(option.key!) ?? new Set(),
          };
        });

      // Enforce the maximum limit
      const limitedSelection = (newSelectedValues ?? []).slice(0, MAX_VALUES_SELECTIONS);
      onChange(limitedSelection);
    },
    [onChange, metricsByFieldValue]
  );

  const isLoading = isFieldsLoading;

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

        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          responsive={false}
          gutterSize="s"
        >
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

  return (
    <ToolbarSelector
      data-test-subj={METRICS_VALUES_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={selectedValues}
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
