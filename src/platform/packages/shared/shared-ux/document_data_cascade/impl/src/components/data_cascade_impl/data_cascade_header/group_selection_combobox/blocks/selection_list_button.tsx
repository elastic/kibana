/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButtonEmpty,
  EuiListGroup,
  EuiText,
  EuiToken,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

export interface SelectionListButtonProps {
  selectionOptions: string[];
  selectedOptions: string[];
  onSelection: (groupByColumn: string) => void;
  clearSelection: () => void;
}

const MAX_SELECTABLE_COLUMNS = 3;

export function SelectionListButton({
  selectionOptions,
  selectedOptions,
  onSelection,
  clearSelection,
}: SelectionListButtonProps) {
  const [availableColumnsIsOpen, setAvailableColumnsIsOpen] = useState(false);

  return (
    <EuiFlexGroup direction="row" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelPaddingSize="xs"
          isOpen={availableColumnsIsOpen}
          onClick={() => setAvailableColumnsIsOpen(!availableColumnsIsOpen)}
          closePopover={() => setAvailableColumnsIsOpen(false)}
          button={
            <EuiButtonEmpty
              aria-label={i18n.translate(
                'sharedUXPackages.data_cascade.selection_dropdown.open_popover',
                { defaultMessage: 'Open available columns popover' }
              )}
              size="xs"
              flush="left"
              iconType="arrowDown"
              iconSide="right"
              disabled={
                !selectionOptions?.length || selectedOptions.length - 1 >= MAX_SELECTABLE_COLUMNS
              }
            >
              {i18n.translate(
                'sharedUXPackages.data_cascade.selection_dropdown.available_selection_btn_text',
                { defaultMessage: 'Pick items to groupBy' }
              )}
            </EuiButtonEmpty>
          }
        >
          <EuiListGroup
            flush={true}
            maxWidth={false}
            listItems={selectionOptions?.map((selectionOption) => ({
              label: <EuiText size="s">{selectionOption}</EuiText>,
              icon: <EuiToken iconType="tokenString" />,
              onClick: onSelection.bind(null, selectionOption),
              'data-test-subj': `DataCascadeColumnSelectionPopover-${selectionOption}`,
            }))}
          />
        </EuiPopover>
      </EuiFlexItem>
      {Boolean(selectedOptions.length) && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            aria-label={i18n.translate(
              'sharedUXPackages.data_cascade.selection_dropdown.clear_selection_btn_text',
              { defaultMessage: 'Clear selection' }
            )}
            onClick={clearSelection}
            size="xs"
            flush="right"
          >
            {i18n.translate(
              'sharedUXPackages.data_cascade.selection_dropdown.clear_selection_btn_text',
              { defaultMessage: 'Clear selection' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
