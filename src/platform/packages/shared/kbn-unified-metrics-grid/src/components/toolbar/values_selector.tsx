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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FIELD_VALUE_SEPARATOR } from '../../common/utils';
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
  clearValuesSelection: () => void;
}
export const ValuesSelector = ({
  selectedDimensions,
  selectedValues,
  onChange,
  timeRange,
  disabled = false,
  indices = [],
  clearValuesSelection,
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
  const { euiTheme } = useEuiTheme();
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
    (chosenOption?: SelectableEntry[]) => {
      const newSelectedValues = chosenOption
        ?.filter((option) => !option.isGroupLabel && option.key)
        .map((option) => option.key!);

      onChange(newSelectedValues ?? []);
    },
    [onChange]
  );

  const buttonLabel = useMemo(() => {
    const count = selectedValues.length;

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
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

  const clearAllSection = useMemo(() => {
    return (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            color="subdued"
            css={css`
              padding: ${euiTheme.size.s};
            `}
          >
            <FormattedMessage
              id="metricsExperience.valuesSelector.selectedStatusMessage"
              defaultMessage="{count, plural, one {# value selected} other {# values selected}}"
              values={{ count: selectedValues?.length }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {selectedValues?.length > 0 && (
            <EuiButtonEmpty size="s" flush="both" onClick={clearValuesSelection}>
              {i18n.translate('metricsExperience.valuesSelector.clearSelectionButtonLabel', {
                defaultMessage: 'Clear selection',
              })}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [euiTheme.size.s, selectedValues?.length, clearValuesSelection]);

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
      data-test-subj="metricsExperienceValuesSelector"
      data-selected-value={selectedDimensions}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={({ option, normalizedSearchValue }) => {
        return 'name' in option
          ? String(option.name ?? '').includes(normalizedSearchValue)
          : option.label.includes(normalizedSearchValue);
      }}
      options={options}
      singleSelection={false}
      hasArrow={!isLoading}
      onChange={handleChange}
      disabled={disabled}
      clearAllSection={clearAllSection}
    />
  );
};
