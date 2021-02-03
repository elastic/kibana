/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './discover_field_search.scss';

import React, { OptionHTMLAttributes, ReactNode, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiForm,
  EuiFormRow,
  EuiButtonGroup,
  EuiOutsideClickDetector,
  EuiFilterButton,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface State {
  searchable: string;
  aggregatable: string;
  type: string;
  missing: boolean;
  [index: string]: string | boolean;
}

export interface Props {
  /**
   * triggered on input of user into search field
   */
  onChange: (field: string, value: string | boolean | undefined) => void;

  /**
   * the input value of the user
   */
  value?: string;

  /**
   * types for the type filter
   */
  types: string[];
}

/**
 * Component is Discover's side bar to  search of available fields
 * Additionally there's a button displayed that allows the user to show/hide more filter fields
 */
export function DiscoverFieldSearch({ onChange, value, types }: Props) {
  const searchPlaceholder = i18n.translate('discover.fieldChooser.searchPlaceHolder', {
    defaultMessage: 'Search field names',
  });
  const aggregatableLabel = i18n.translate('discover.fieldChooser.filter.aggregatableLabel', {
    defaultMessage: 'Aggregatable',
  });
  const searchableLabel = i18n.translate('discover.fieldChooser.filter.searchableLabel', {
    defaultMessage: 'Searchable',
  });
  const typeLabel = i18n.translate('discover.fieldChooser.filter.typeLabel', {
    defaultMessage: 'Type',
  });
  const typeOptions = types
    ? types.map((type) => {
        return { value: type, text: type };
      })
    : [{ value: 'any', text: 'any' }];

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const [values, setValues] = useState<State>({
    searchable: 'any',
    aggregatable: 'any',
    type: 'any',
    missing: true,
  });

  if (typeof value !== 'string') {
    // at initial rendering value is undefined (angular related), this catches the warning
    // should be removed once all is react
    return null;
  }

  const filterBtnAriaLabel = isPopoverOpen
    ? i18n.translate('discover.fieldChooser.toggleFieldFilterButtonHideAriaLabel', {
        defaultMessage: 'Hide field filter settings',
      })
    : i18n.translate('discover.fieldChooser.toggleFieldFilterButtonShowAriaLabel', {
        defaultMessage: 'Show field filter settings',
      });

  const handleFilterButtonClicked = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const applyFilterValue = (id: string, filterValue: string | boolean) => {
    switch (filterValue) {
      case 'any':
        if (id !== 'type') {
          onChange(id, undefined);
        } else {
          onChange(id, filterValue);
        }
        break;
      case 'true':
        onChange(id, true);
        break;
      case 'false':
        onChange(id, false);
        break;
      default:
        onChange(id, filterValue);
    }
  };

  const isFilterActive = (name: string, filterValue: string | boolean) => {
    return name !== 'missing' && filterValue !== 'any';
  };

  const handleValueChange = (name: string, filterValue: string | boolean) => {
    const previousValue = values[name];
    updateFilterCount(name, previousValue, filterValue);
    const updatedValues = { ...values };
    updatedValues[name] = filterValue;
    setValues(updatedValues);
    applyFilterValue(name, filterValue);
  };

  const updateFilterCount = (
    name: string,
    previousValue: string | boolean,
    currentValue: string | boolean
  ) => {
    const previouslyFilterActive = isFilterActive(name, previousValue);
    const filterActive = isFilterActive(name, currentValue);
    const diff = Number(filterActive) - Number(previouslyFilterActive);
    setActiveFiltersCount(activeFiltersCount + diff);
  };

  const handleMissingChange = (e: EuiSwitchEvent) => {
    const missingValue = e.target.checked;
    handleValueChange('missing', missingValue);
  };

  const buttonContent = (
    <EuiFilterButton
      aria-label={filterBtnAriaLabel}
      data-test-subj="toggleFieldFilterButton"
      iconType="arrowDown"
      isSelected={activeFiltersCount > 0}
      numFilters={0}
      hasActiveFilters={activeFiltersCount > 0}
      numActiveFilters={activeFiltersCount}
      onClick={handleFilterButtonClicked}
    >
      <FormattedMessage
        id="discover.fieldChooser.fieldFilterButtonLabel"
        defaultMessage="Filter by type"
      />
    </EuiFilterButton>
  );

  const select = (
    id: string,
    selectOptions: Array<{ text: ReactNode } & OptionHTMLAttributes<HTMLOptionElement>>,
    selectValue: string
  ) => {
    return (
      <EuiSelect
        id={`${id}-select`}
        options={selectOptions}
        value={selectValue}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          handleValueChange(id, e.target.value)
        }
        aria-label={i18n.translate('discover.fieldChooser.filter.fieldSelectorLabel', {
          defaultMessage: 'Selection of {id} filter options',
          values: { id },
        })}
        data-test-subj={`${id}Select`}
        compressed
      />
    );
  };

  const toggleButtons = (id: string) => {
    return [
      {
        id: `${id}-any`,
        label: 'any',
      },
      {
        id: `${id}-true`,
        label: 'yes',
      },
      {
        id: `${id}-false`,
        label: 'no',
      },
    ];
  };

  const buttonGroup = (id: string, legend: string) => {
    return (
      <EuiButtonGroup
        legend={legend}
        options={toggleButtons(id)}
        idSelected={`${id}-${values[id]}`}
        onChange={(optionId: string) => handleValueChange(id, optionId.replace(`${id}-`, ''))}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={`${id}ButtonGroup`}
      />
    );
  };

  const selectionPanel = (
    <div className="dscFieldSearch__formWrapper">
      <EuiForm data-test-subj="filterSelectionPanel">
        <EuiFormRow fullWidth label={aggregatableLabel} display="columnCompressed">
          {buttonGroup('aggregatable', aggregatableLabel)}
        </EuiFormRow>
        <EuiFormRow fullWidth label={searchableLabel} display="columnCompressed">
          {buttonGroup('searchable', searchableLabel)}
        </EuiFormRow>
        <EuiFormRow fullWidth label={typeLabel} display="columnCompressed">
          {select('type', typeOptions, values.type)}
        </EuiFormRow>
      </EuiForm>
    </div>
  );

  return (
    <React.Fragment>
      <EuiFlexGroup responsive={false} gutterSize={'s'}>
        <EuiFlexItem>
          <EuiFieldSearch
            aria-label={searchPlaceholder}
            data-test-subj="fieldFilterSearchInput"
            fullWidth
            onChange={(event) => onChange('name', event.currentTarget.value)}
            placeholder={searchPlaceholder}
            value={value}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiOutsideClickDetector onOutsideClick={() => {}} isDisabled={!isPopoverOpen}>
        <EuiFilterGroup className="dscFieldSearch__filterWrapper">
          <EuiPopover
            id="dataPanelTypeFilter"
            panelClassName="euiFilterGroup__popoverPanel"
            panelPaddingSize="none"
            anchorPosition="rightUp"
            display="block"
            isOpen={isPopoverOpen}
            closePopover={() => {
              setPopoverOpen(false);
            }}
            button={buttonContent}
          >
            <EuiPopoverTitle>
              {i18n.translate('discover.fieldChooser.filter.filterByTypeLabel', {
                defaultMessage: 'Filter by type',
              })}
            </EuiPopoverTitle>
            {selectionPanel}
            <EuiPopoverFooter>
              <EuiSwitch
                label={i18n.translate('discover.fieldChooser.filter.hideMissingFieldsLabel', {
                  defaultMessage: 'Hide missing fields',
                })}
                checked={values.missing}
                onChange={handleMissingChange}
                data-test-subj="missingSwitch"
              />
            </EuiPopoverFooter>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiOutsideClickDetector>
    </React.Fragment>
  );
}
