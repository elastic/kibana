/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFacetButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiPanel,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldSelector } from './field_selector';

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
   * determines whether additional filter fields are displayed
   */
  showFilter: boolean;
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
export function DiscoverFieldSearch({ showFilter, onChange, value, types }: Props) {
  if (typeof value !== 'string') {
    // at initial rendering value is undefined (angular related), this catches the warning
    // should be removed once all is react
    return null;
  }
  const filterBtnAriaLabel = showFilter
    ? i18n.translate('kbn.discover.fieldChooser.toggleFieldFilterButtonHideAriaLabel', {
        defaultMessage: 'Hide field filter settings',
      })
    : i18n.translate('kbn.discover.fieldChooser.toggleFieldFilterButtonShowAriaLabel', {
        defaultMessage: 'Show field filter settings',
      });
  const searchPlaceholder = i18n.translate('kbn.discover.fieldChooser.searchPlaceHolder', {
    defaultMessage: 'Search fields',
  });
  const options = [
    { value: 'any', text: 'any' },
    { value: 'true', text: 'yes' },
    { value: 'false', text: 'no' },
  ];

  const typeOptions = types
    ? types.map(type => {
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

  const handleFacetButtonClicked = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const applyFilterValue = (id: string, filterValue: string | boolean) => {
    switch (filterValue) {
      case 'any':
        onChange(id, undefined);
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

  const handleMissingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const missingValue = e.target.checked;
    handleValueChange('missing', missingValue);
  };

  const buttonContent = (
    <EuiFacetButton
      aria-label={filterBtnAriaLabel}
      data-test-subj="toggleFieldFilterButton"
      className="dscToggleFieldFilterButton"
      icon={<EuiIcon type="filter" />}
      isSelected={activeFiltersCount > 0}
      quantity={activeFiltersCount}
      onClick={handleFacetButtonClicked}
    >
      <FormattedMessage
        id="kbn.discover.fieldChooser.fieldFilterFacetButtonLabel"
        defaultMessage="Fields filtered"
      />
    </EuiFacetButton>
  );

  const selectionPanel = (
    <EuiPanel paddingSize="s">
      <FieldSelector
        id={'aggregatable'}
        options={options}
        value={values.aggregatable}
        onChange={handleValueChange}
        label={i18n.translate('kbn.discover.fieldChooser.filter.aggregatableLabel', {
          defaultMessage: 'Aggregatable',
        })}
      />
      <FieldSelector
        id={'searchable'}
        options={options}
        value={values.searchable}
        onChange={handleValueChange}
        label={i18n.translate('kbn.discover.fieldChooser.filter.searchableLabel', {
          defaultMessage: 'Searchable',
        })}
      />
      <FieldSelector
        id={'type'}
        options={typeOptions}
        value={values.type}
        onChange={handleValueChange}
        label={i18n.translate('kbn.discover.fieldChooser.filter.typeLabel', {
          defaultMessage: 'Type',
        })}
      />
      <EuiSpacer size="s" />
      <EuiSwitch
        label={i18n.translate('kbn.discover.fieldChooser.filter.hideMissingFieldsLabel', {
          defaultMessage: 'Hide missing fields',
        })}
        checked={values.missing}
        onChange={handleMissingChange}
      />
    </EuiPanel>
  );

  return (
    <React.Fragment>
      <EuiFlexGroup responsive={false} gutterSize={'s'}>
        <EuiFlexItem>
          <EuiFieldSearch
            aria-label={searchPlaceholder}
            data-test-subj="fieldFilterSearchInput"
            compressed
            fullWidth
            onChange={event => onChange('name', event.currentTarget.value)}
            placeholder={searchPlaceholder}
            value={value}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className="lnsInnerIndexPatternDataPanel__filtersWrapper">
        <EuiPopover
          id="dataPanelTypeFilter"
          panelClassName="euiFilterGroup__popoverPanel"
          panelPaddingSize="none"
          anchorPosition="downLeft"
          display="block"
          isOpen={isPopoverOpen}
          closePopover={() => {}}
          button={buttonContent}
        >
          <EuiPopoverTitle>
            {i18n.translate('xpack.lens.indexPatterns.filterByTypeLabel', {
              defaultMessage: 'Filter by type',
            })}
          </EuiPopoverTitle>
          {selectionPanel}
        </EuiPopover>
      </div>
    </React.Fragment>
  );
}
