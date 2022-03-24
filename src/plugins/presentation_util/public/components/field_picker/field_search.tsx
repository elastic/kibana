/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiOutsideClickDetector,
  EuiFilterButton,
  EuiSpacer,
  EuiPopoverTitle,
} from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { FormattedMessage } from '@kbn/i18n-react';

import './field_search.scss';

export interface Props {
  onSearchChange: (value: string) => void;
  searchValue?: string;

  onFieldTypesChange: (value: string[]) => void;
  fieldTypesValue: string[];

  availableFieldTypes: string[];
}

export function FieldSearch({
  onSearchChange,
  searchValue,
  onFieldTypesChange,
  fieldTypesValue,
  availableFieldTypes,
}: Props) {
  const searchPlaceholder = i18n.translate('presentationUtil.fieldSearch.searchPlaceHolder', {
    defaultMessage: 'Search field names',
  });

  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const handleFilterButtonClicked = () => {
    setPopoverOpen(!isPopoverOpen);
  };

  const buttonContent = (
    <EuiFilterButton
      data-test-subj="toggleFieldFilterButton"
      iconType="arrowDown"
      isSelected={fieldTypesValue.length > 0}
      numFilters={0}
      hasActiveFilters={fieldTypesValue.length > 0}
      numActiveFilters={fieldTypesValue.length}
      onClick={handleFilterButtonClicked}
    >
      <FormattedMessage
        id="presentationUtil.fieldSearch.fieldFilterButtonLabel"
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
            data-test-subj="field-search-input"
            fullWidth
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder={searchPlaceholder}
            value={searchValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiOutsideClickDetector onOutsideClick={() => {}} isDisabled={!isPopoverOpen}>
        <EuiFilterGroup>
          <EuiPopover
            panelClassName="euiFilterGroup__popoverPanel presFilterByType__panel"
            panelPaddingSize="none"
            display="block"
            isOpen={isPopoverOpen}
            closePopover={() => {
              setPopoverOpen(false);
            }}
            button={buttonContent}
          >
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('presentationUtil.fieldSearch.filterByTypeLabel', {
                defaultMessage: 'Filter by type',
              })}
            </EuiPopoverTitle>
            <EuiContextMenuPanel
              watchedItemProps={['icon', 'disabled']}
              items={(availableFieldTypes as string[]).map((type) => (
                <EuiContextMenuItem
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
                  <EuiFlexGroup gutterSize="xs" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <FieldIcon type={type} label={type} />
                    </EuiFlexItem>
                    <EuiFlexItem>{type}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiContextMenuItem>
              ))}
            />
          </EuiPopover>
        </EuiFilterGroup>
      </EuiOutsideClickDetector>
    </React.Fragment>
  );
}
