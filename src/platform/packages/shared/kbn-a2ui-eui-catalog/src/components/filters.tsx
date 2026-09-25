/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import type { CatalogComponent, ChildList, ComponentRenderProps } from '@kbn/a2ui-renderer';
import { bool, objectArray, oneOf, str } from '../coerce';

/**
 * Groups filter pills so they render as one joined control.
 */
export const FilterGroup: CatalogComponent = {
  name: 'FilterGroup',
  render: ({ props, buildChild, accessibility }) => (
    <EuiFilterGroup fullWidth={bool(props.fullWidth)} aria-label={accessibility?.label}>
      {buildChild(props.children as ChildList)}
    </EuiFilterGroup>
  ),
};

const asArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

/**
 * A filter pill with a searchable checkbox list.
 *
 * Unlike Modal, Flyout and Popover, this one holds its own open state. The
 * distinction is deliberate: those three position *arbitrary author content* and
 * so are app state the document should control, whereas this dropdown shows one
 * input's own options and nothing else — the same kind of disclosure state
 * EuiSelect and EuiDatePicker already keep to themselves. Modelling it would cost
 * three extra JSON nodes per filter and encode nothing an author would want.
 */
function MultiSelectFilterRenderer({
  props,
  getBindingPath,
  setValue,
  accessibility,
}: ComponentRenderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const path = getBindingPath('value');
  const selected = asArray(props.value);
  const labelField = str(props.optionLabelField, 'label');
  const valueField = str(props.optionValueField, 'value');

  // Options usually bind straight to ES|QL rows, so the field names are
  // configurable rather than forcing the query to alias its columns.
  const options: EuiSelectableOption[] = objectArray(props.options).map((option) => {
    const value = str(option[valueField]);
    return {
      key: value,
      label: str(option[labelField], value),
      checked: selected.includes(value) ? 'on' : undefined,
    };
  });

  const label = str(props.label);
  const disabled = bool(props.disabled) || !path;
  const single = bool(props.singleSelection);

  const onChange = (next: EuiSelectableOption[]) => {
    if (!path) return;
    const chosen = next
      .filter((option) => option.checked === 'on')
      .map((option) => String(option.key));
    setValue(path, chosen);
    if (single) setIsOpen(false);
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      aria-label={label}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          isDisabled={disabled}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length > 0 ? selected.length : undefined}
          numFilters={options.length}
          // Only when the author overrides it. Setting it from `label`
          // unconditionally would make the button announce "Cluster" while
          // displaying "All clusters" — the accessible name must contain the
          // visible text, or voice control cannot address the button.
          aria-label={accessibility?.label}
        >
          {/* The empty label is what the mockup's "All clusters" pills show. */}
          {selected.length > 0 ? label : str(props.emptyLabel, label)}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={label}
        searchable={bool(props.searchable, true)}
        options={options}
        singleSelection={single}
        onChange={onChange}
      >
        {(list, search) => (
          <div style={{ width: 280 }}>
            {search}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}

export const MultiSelectFilter: CatalogComponent = {
  name: 'MultiSelectFilter',
  render: MultiSelectFilterRenderer,
};

/** A segmented control, normally icon-only, for switching between views. */
export const ToggleGroup: CatalogComponent = {
  name: 'ToggleGroup',
  render: ({ id, props, getBindingPath, setValue, accessibility }) => {
    const path = getBindingPath('value');
    const options = objectArray(props.options).map((option) => {
      const value = str(option.value);
      return {
        id: value,
        label: str(option.label, value),
        iconType: option.iconType ? str(option.iconType) : undefined,
      };
    });

    return (
      <EuiButtonGroup
        // EuiButtonGroup needs a legend even when the labels are visible; the
        // schema requires one so an icon-only group is never anonymous.
        legend={accessibility?.label ?? str(props.legend)}
        name={id}
        idSelected={str(props.value)}
        options={options}
        isIconOnly={bool(props.iconOnly)}
        isDisabled={bool(props.disabled) || !path}
        buttonSize={oneOf(props.size, ['compressed', 's', 'm'] as const, 's')}
        onChange={(next) => path && setValue(path, next)}
      />
    );
  },
};
