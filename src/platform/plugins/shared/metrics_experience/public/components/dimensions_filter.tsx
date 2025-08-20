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
} from '@elastic/eui';
import React, { useState, useMemo, useCallback } from 'react';

interface DimensionsFilterProps {
  fields: Array<{
    name: string;
    dimensions: Array<{ name: string; type: string; description?: string }>;
  }>;
  selectedDimensions: string[];
  onDimensionChange: (dimensions: string[]) => void;
  searchTerm: string;
  onApplyChanges?: () => void;
}

export const DimensionsFilter = ({
  fields,
  selectedDimensions,
  onDimensionChange,
  searchTerm,
  onApplyChanges,
}: DimensionsFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Extract all unique dimensions from fields that match the search term
  const allDimensions = useMemo(() => {
    const dimensionMap = new Map<string, { name: string; type: string; description?: string }>();

    // Filter fields by search term first
    const filteredFields = fields.filter((field) =>
      field.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredFields.forEach((field) => {
      field.dimensions.forEach((dimension) => {
        // Keep the first occurrence (with potential description)
        if (!dimensionMap.has(dimension.name)) {
          dimensionMap.set(dimension.name, dimension);
        }
      });
    });

    return Array.from(dimensionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fields, searchTerm]);

  // Calculate which dimensions intersect with currently selected dimensions
  const intersectingDimensions = useMemo(() => {
    if (selectedDimensions.length === 0) {
      return new Set(allDimensions.map((d) => d.name));
    }

    const intersectingSet = new Set<string>();

    // Filter fields by search term first, then find fields that contain ALL of the selected dimensions
    const filteredFields = fields.filter((field) =>
      field.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fieldsWithAllSelectedDimensions = filteredFields.filter((field) =>
      selectedDimensions.every((selectedDim) =>
        field.dimensions.some((dim) => dim.name === selectedDim)
      )
    );

    // Collect all dimensions from those fields that contain all selected dimensions
    fieldsWithAllSelectedDimensions.forEach((field) => {
      field.dimensions.forEach((dimension) => {
        intersectingSet.add(dimension.name);
      });
    });

    return intersectingSet;
  }, [fields, selectedDimensions, allDimensions, searchTerm]);

  // Convert dimensions to EuiSelectable options
  const options: EuiSelectableOption[] = useMemo(() => {
    return allDimensions.map((dimension) => ({
      label: dimension.name,
      checked: selectedDimensions.includes(dimension.name) ? 'on' : undefined,
      disabled: !intersectingDimensions.has(dimension.name),
      // Add description as tooltip for EuiSelectable
      toolTipContent: dimension.description,
    }));
  }, [allDimensions, selectedDimensions, intersectingDimensions]);

  const handleSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSelectedDimensions = newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.label);

      onDimensionChange(newSelectedDimensions);

      // Apply changes immediately after dimension selection
      if (onApplyChanges) {
        onApplyChanges();
      }
    },
    [onDimensionChange, onApplyChanges]
  );

  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    onDimensionChange([]);

    // Apply changes immediately after clearing dimensions
    if (onApplyChanges) {
      onApplyChanges();
    }
  }, [onDimensionChange, onApplyChanges]);

  const getHeaderText = () => {
    if (selectedDimensions.length === 0) {
      return 'Select dimensions';
    }
    return `${selectedDimensions.length} dimension${
      selectedDimensions.length === 1 ? '' : 's'
    } selected`;
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      iconSide="right"
      hasActiveFilters={selectedDimensions.length > 0}
      numActiveFilters={selectedDimensions.length}
    >
      Breakdown by dimensions
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
          {selectedDimensions.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={handleClearFilters}>
                Clear dimensions
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiSelectable
          searchable
          options={options}
          onChange={handleSelectionChange}
          searchProps={{
            placeholder: 'Search dimensions...',
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
      </div>
    </EuiPopover>
  );
};
