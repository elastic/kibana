/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterButton,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '../field_icon';
import { getFieldTypeName } from '../../utils/field_types';
import { type FieldTypeKnown } from '../../types';

export interface FieldTypeFilterProps {
  selectedFieldTypes: FieldTypeKnown[];
  availableFieldTypes: FieldTypeKnown[];
  onChange: (fieldTypes: FieldTypeKnown[]) => unknown;
}

// TODO: refactor test-subj and className
// TODO: add icon and type name components

export const FieldTypeFilter: React.FC<FieldTypeFilterProps> = ({
  selectedFieldTypes,
  availableFieldTypes,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <EuiPopover
      id="unifiedFieldTypeFilter"
      panelClassName="euiFilterGroup__popoverPanel"
      panelPaddingSize="none"
      anchorPosition="rightUp"
      display="block"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiFilterButton
          aria-label={i18n.translate('unifiedFieldList.fieldTypeFilter.filterByTypeAriaLabel', {
            defaultMessage: 'Filter by type',
          })}
          color="primary"
          isSelected={isOpen}
          numFilters={selectedFieldTypes.length}
          hasActiveFilters={!!selectedFieldTypes.length}
          numActiveFilters={selectedFieldTypes.length}
          data-test-subj="lnsIndexPatternFiltersToggle"
          className="lnsFilterButton"
          onClick={() => setIsOpen((value) => !value)}
        >
          <EuiIcon type="filter" />
        </EuiFilterButton>
      }
    >
      <EuiContextMenuPanel
        data-test-subj="lnsIndexPatternTypeFilterOptions"
        items={availableFieldTypes.map((type) => (
          <EuiContextMenuItem
            className="lnsInnerIndexPatternDataPanel__filterType"
            key={type}
            icon={selectedFieldTypes.includes(type) ? 'check' : 'empty'}
            data-test-subj={`typeFilter-${type}`}
            onClick={() => {
              onChange(
                selectedFieldTypes.includes(type)
                  ? selectedFieldTypes.filter((t) => t !== type)
                  : [...selectedFieldTypes, type]
              );
            }}
          >
            <EuiFlexGroup responsive={false} gutterSize="s">
              <EuiFlexItem grow={false}>
                <FieldIcon type={type} />
              </EuiFlexItem>
              <EuiFlexItem>{getFieldTypeName(type)}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
