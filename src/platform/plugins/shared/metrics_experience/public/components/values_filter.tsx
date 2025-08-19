/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useState, useMemo, useCallback } from 'react';
import { useDimensionsQuery } from '../hooks';

interface ValuesFilterProps {
  selectedDimensions: string[];
  selectedValues: string[];
  indices?: string[];
  disabled?: boolean;
  timeRange?: {
    from?: string;
    to?: string;
  };
  onApplyChanges?: () => void;
  onValueChange: (values: string[]) => void;
}

export const ValuesFilter = ({
  selectedDimensions,
  selectedValues,
  onValueChange,
  onApplyChanges,
  timeRange,
  disabled = false,
  indices = [],
}: ValuesFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Query dimension values from API
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
  const options: EuiSelectableOption[] = useMemo(() => {
    const groupedValues = new Map<string, string[]>();

    // Group values by field
    (values as Array<{ value: string; field: string }>).forEach(({ value, field }) => {
      if (!groupedValues.has(field)) {
        groupedValues.set(field, []);
      }
      groupedValues.get(field)!.push(value);
    });

    const euiSelectableOptions: EuiSelectableOption[] = [];

    // Create options with group labels
    Array.from(groupedValues.entries()).forEach(([field, fieldValues]) => {
      // Add group label
      euiSelectableOptions.push({
        label: field,
        isGroupLabel: true,
      });

      // Add field values
      fieldValues.forEach((value) => {
        const key = `${field}${0x1d}${value}`;
        euiSelectableOptions.push({
          label: value,
          checked: selectedValues.includes(key) ? 'on' : undefined,
          key,
        });
      });
    });

    return euiSelectableOptions;
  }, [values, selectedValues]);

  const handleSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedValues = newOptions
        .filter((option) => option.checked === 'on' && !option.isGroupLabel && option.key)
        .map((option) => option.key!);

      onValueChange(newSelectedValues);

      // Apply changes immediately after value selection
      if (onApplyChanges) {
        onApplyChanges();
      }
    },
    [onValueChange, onApplyChanges]
  );

  const togglePopover = useCallback(() => {
    if (!disabled && selectedDimensions.length > 0) {
      setIsPopoverOpen(!isPopoverOpen);
    }
  }, [isPopoverOpen, disabled, selectedDimensions.length]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    onValueChange([]);

    // Apply changes immediately after clearing values
    if (onApplyChanges) {
      onApplyChanges();
    }
  }, [onValueChange, onApplyChanges]);

  const getHeaderText = () => {
    if (selectedValues.length === 0) {
      return 'Select values';
    }
    return `${selectedValues.length} value${selectedValues.length === 1 ? '' : 's'} selected`;
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      iconSide="right"
      disabled={disabled || selectedDimensions.length === 0}
      hasActiveFilters={selectedValues.length > 0}
      numActiveFilters={selectedValues.length}
    >
      Limit by values
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
      panelPaddingSize="s"
    >
      <div style={{ width: '300px' }}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              <p>{getHeaderText()}</p>
            </EuiText>
          </EuiFlexItem>
          {selectedValues.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={handleClearFilters}>
                Clear values
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <EuiLoadingSpinner size="m" />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              Loading values...
            </EuiText>
          </div>
        ) : error ? (
          <EuiText size="s" color="danger">
            <p>Error loading values</p>
          </EuiText>
        ) : (
          <EuiSelectable
            searchable
            options={options}
            onChange={handleSelectionChange}
            searchProps={{
              placeholder: 'Search values...',
              compressed: true,
            }}
          >
            {(list, search) => (
              <div>
                {search}
                <EuiSpacer size="xs" />
                {list}
              </div>
            )}
          </EuiSelectable>
        )}
      </div>
    </EuiPopover>
  );
};
