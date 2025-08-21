/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';

const WORKFLOW_POPOVER_WIDTH = 500;

interface WorkflowFilterPopoverProps {
  filter: string;
  title: string;
  selectedValues: any[];
  values: EuiSelectableOption[];
  onSelectedValuesChanged: (newValues: any[]) => void;
}

export const toggleSelectedGroup = (
  group: string,
  selectedGroups: string[],
  setSelectedGroups: (groups: string[]) => void
): void => {
  const selectedGroupIndex = selectedGroups.indexOf(group);
  const updatedSelectedGroups = [...selectedGroups];
  if (selectedGroupIndex >= 0) {
    updatedSelectedGroups.splice(selectedGroupIndex, 1);
  } else {
    updatedSelectedGroups.push(group);
  }
  setSelectedGroups(updatedSelectedGroups);
};

const WorkflowsFilterPopoverComponent = ({
  filter,
  title,
  values,
  selectedValues,
  onSelectedValuesChanged,
}: WorkflowFilterPopoverProps) => {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>(() => {
    const selectedValuesSet = new Set(selectedValues);

    return values.map(
      ({ label, key }): EuiSelectableOption => ({
        label,
        key,
        checked: selectedValuesSet.has(key!) ? 'on' : undefined,
      })
    );
  });

  const handleSelectableOptionsChange = (newOptions: EuiSelectableOption[]) => {
    onSelectedValuesChanged(
      newOptions
        .map(({ key, checked }: any): string | number | boolean | null => (checked ? key : null))
        .filter((value) => value !== null)
    );
  };

  useEffect(() => {
    const selectedValuesSet = new Set(selectedValues);
    const newSelectableOptions: EuiSelectableOption[] = values.map(
      ({ label, key }): EuiSelectableOption => {
        return {
          label,
          key,
          checked: selectedValuesSet.has(key!) ? 'on' : undefined,
        };
      }
    );

    setSelectableOptions(newSelectableOptions);
  }, [values, selectedValues]);

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="arrowDown"
      onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
      numFilters={values.length}
      isSelected={isFilterPopoverOpen}
      hasActiveFilters={selectedValues.length > 0}
      numActiveFilters={selectedValues.length}
      data-test-subj={`${filter}-filter-popover-button`}
    >
      {title}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isFilterPopoverOpen}
      closePopover={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': `${filter}-filter-popover`,
      }}
    >
      <EuiSelectable
        searchProps={{
          placeholder: 'Search',
        }}
        aria-label="Search"
        options={selectableOptions}
        onChange={handleSelectableOptionsChange}
        emptyMessage="No items available"
        noMatchesMessage="No items available"
      >
        {(list, search) => (
          <div css={{ width: WORKFLOW_POPOVER_WIDTH }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

WorkflowsFilterPopoverComponent.displayName = 'WorkflowsFilterPopoverComponent';

export const WorkflowsFilterPopover = React.memo(WorkflowsFilterPopoverComponent);

WorkflowsFilterPopover.displayName = 'WorkflowsFilterPopover';
