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

export interface Props {
  /**
   * triggered on input of user into search field
   */
  onChange: (field: string, value: string) => void;
  /**
   * triggered when the "additional filter btn" is clicked
   */
  onShowFilter: () => void;
  /**
   * determines whether additional filter fields are displayed
   */
  showFilter: boolean;
  /**
   * the input value of the user
   */
  value?: string;

  types: string[];
}

/**
 * Component is Discover's side bar to  search of available fields
 * Additionally there's a button displayed that allows the user to show/hide more filter fields
 */
export function DiscoverFieldSearch({ showFilter, onChange, onShowFilter, value, types }: Props) {
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
    { value: undefined, text: 'any' },
    { value: true, text: 'yes' },
    { value: false, text: 'no' },
  ];
  const typeOptions = types
    ? types.map(type => {
        return { value: type, text: type };
      })
    : [{ value: undefined, text: 'any' }];
  const [filtersActive, setFiltersActive] = useState({
    searchable: false,
    aggregatable: false,
    type: false,
  });
  const [filtersActiveCount, setFiltersActiveCount] = useState(0);
  const [values, setValues] = useState({
    searchable: options[0].value,
    aggregatable: options[0].value,
    type: 'any',
  });
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const handleFacetButtonClicked = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const buttonContent = (
    <EuiFacetButton
      aria-label={filterBtnAriaLabel}
      data-test-subj="toggleFieldFilterButton"
      className="dscToggleFieldFilterButton"
      icon={<EuiIcon type="filter" />}
      isSelected={filtersActiveCount > 0}
      quantity={filtersActiveCount}
      onClick={handleFacetButtonClicked}
    >
      <FormattedMessage
        id="kbn.discover.fieldChooser.fieldFilterFacetButtonLabel"
        defaultMessage="Fields filtered"
      />
    </EuiFacetButton>
  );

  const updateFilterActiveCount = (oldValue: number, newValue: number) => {
    const diff = newValue - oldValue;
    setFiltersActiveCount(filtersActiveCount + diff);
  };

  const updateValue = (id: string, fieldValue: string) => {
    const updatedValues = { ...values };
    updatedValues[id] = fieldValue;
    setValues(updatedValues);
  };

  const updateFiltersActive = (id: string, fieldValue: string) => {
    const filterActive = Number(fieldValue !== 'any');
    const updatedFiltersActive = { ...filtersActive };
    updatedFiltersActive[id] = !!filterActive;
    setFiltersActive(updatedFiltersActive);
  };

  const handleValueChange = (id: string, fieldValue: string) => {
    updateValue(id, fieldValue);
    const filterActive = Number(fieldValue !== 'any');
    const previouslyFilterActive = Number(filtersActive[id]);
    updateFilterActiveCount(previouslyFilterActive, filterActive);
    updateFiltersActive(id, value);
    onChange(id, fieldValue);
  };

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
            <EuiSwitch label="Hide missing fields" checked={true} onChange={() => {}} />
          </EuiPanel>
        </EuiPopover>
      </div>
    </React.Fragment>
  );
}
