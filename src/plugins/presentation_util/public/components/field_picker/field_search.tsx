/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './field_search.scss';

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
  EuiContextMenuPanel,
  EuiContextMenuItem,
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
import { FieldIcon, FieldButton } from '../../../../kibana_react/public';

export type FieldOnlyDataType = 'document' | 'ip' | 'histogram' | 'geo_point' | 'geo_shape';
export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;

export interface State {
  searchable: string;
  aggregatable: string;
  type: string;
  missing: boolean;
  [index: string]: string | boolean;
}

export interface Props {
  onSearchChange: (value: string) => void;
  searchValue?: string;

  onFieldTypesChange: (value: DataType[]) => void;
  fieldTypesValue: DataType[];

  availableFieldTypes: DataType[];
}

export function FieldSearch({
  onSearchChange,
  searchValue,
  onFieldTypesChange,
  fieldTypesValue,
  availableFieldTypes,
}: Props) {
  const searchPlaceholder = i18n.translate('discover.fieldChooser.searchPlaceHolder', {
    defaultMessage: 'Search field names',
  });

  const typeLabel = i18n.translate('discover.fieldChooser.filter.typeLabel', {
    defaultMessage: 'Type',
  });

  const [isPopoverOpen, setPopoverOpen] = useState(false);

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

  const buttonContent = (
    <EuiFilterButton
      aria-label={filterBtnAriaLabel}
      data-test-subj="toggleFieldFilterButton"
      iconType="arrowDown"
      isSelected={fieldTypesValue.length > 0}
      numFilters={0}
      hasActiveFilters={fieldTypesValue.length > 0}
      numActiveFilters={fieldTypesValue.length}
      onClick={handleFilterButtonClicked}
    >
      <FormattedMessage
        id="discover.fieldChooser.fieldFilterButtonLabel"
        defaultMessage="Filter by type"
      />
    </EuiFilterButton>
  );

  return (
    <React.Fragment>
      <EuiFlexGroup responsive={false} gutterSize={'s'}>
        <EuiFlexItem>
          <EuiFieldSearch
            aria-label={searchPlaceholder}
            data-test-subj="fieldFilterSearchInput"
            fullWidth
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            value={searchValue}
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
            <EuiContextMenuPanel
              watchedItemProps={['icon', 'disabled']}
              data-test-subj="lnsIndexPatternTypeFilterOptions"
              items={(availableFieldTypes as DataType[]).map((type) => (
                <EuiContextMenuItem
                  className="lnsInnerIndexPatternDataPanel__filterType"
                  key={type}
                  icon={fieldTypesValue.includes(type) ? 'check' : 'empty'}
                  data-test-subj={`typeFilter-${type}`}
                  onClick={() => {
                    if (fieldTypesValue.includes(type)) {
                      onFieldTypesChange(fieldTypesValue.filter((f) => f !== type));
                    } else {
                      onFieldTypesChange([...fieldTypesValue, type]);
                    }
                  }}
                >
                  <span className="lnsInnerIndexPatternDataPanel__filterTypeInner">
                    <FieldIcon type={type} label={type} />
                    {type}
                  </span>
                </EuiContextMenuItem>
              ))}
            />

            {/* <EuiPopoverTitle paddingSize="s">
              {i18n.translate('discover.fieldChooser.filter.filterByTypeLabel', {
                defaultMessage: 'Filter by type',
              })}
            </EuiPopoverTitle>
            {selectionPanel}
            {footer()} */}
          </EuiPopover>
        </EuiFilterGroup>
      </EuiOutsideClickDetector>
    </React.Fragment>
  );
}
