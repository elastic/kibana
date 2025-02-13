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
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import type { BrowserFields } from '@kbn/rule-registry-plugin/common';
import type { FieldBrowserProps } from '../../types';
import { Search } from '../search';

import {
  CLOSE_BUTTON_CLASS_NAME,
  FIELD_BROWSER_WIDTH,
  RESET_FIELDS_CLASS_NAME,
} from '../../helpers';

import * as i18n from '../../translations';
import { CategoriesSelector } from '../categories_selector';
import { CategoriesBadges } from '../categories_badges';
import { FieldTable } from '../field_table';

export type FieldBrowserModalProps = Pick<
  FieldBrowserProps,
  'width' | 'onResetColumns' | 'onToggleColumn' | 'options'
> & {
  /**
   * The current timeline column headers
   */
  columnIds: string[];
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /** when true, show only the the selected field */
  filterSelectedEnabled: boolean;
  onFilterSelectedChange: (enabled: boolean) => void;
  /**
   * When true, a busy spinner will be shown to indicate the field browser
   * is searching for fields that match the specified `searchInput`
   */
  isSearching: boolean;
  /** The text displayed in the search input */
  searchInput: string;
  /** The text actually being applied to the result set, a debounced version of searchInput */
  appliedFilterInput: string;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryIds: string[];
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  /**
   * Hides the field browser when invoked
   */
  onHide: () => void;
  /**
   * Invoked when the user types in the search input
   */
  onSearchInputChange: (newSearchInput: string) => void;

  /**
   * Focus will be restored to this button if the user presses Escape or clicks
   * the close button. Focus will NOT be restored if the user clicks outside
   * of the popover.
   */
  restoreFocusTo: React.MutableRefObject<HTMLButtonElement | null>;
};

/**
 * This component has no internal state, but it uses lifecycle methods to
 * set focus to the search input, scroll to the selected category, etc
 */
const FieldBrowserModalComponent: React.FC<FieldBrowserModalProps> = ({
  appliedFilterInput,
  columnIds,
  filteredBrowserFields,
  filterSelectedEnabled,
  isSearching,
  onFilterSelectedChange,
  onToggleColumn,
  onResetColumns,
  setSelectedCategoryIds,
  onSearchInputChange,
  onHide,
  options,
  restoreFocusTo,
  searchInput,
  selectedCategoryIds,
  width = FIELD_BROWSER_WIDTH,
}) => {
  const closeAndRestoreFocus = useCallback(() => {
    onHide();
    setTimeout(() => {
      // restore focus on the next tick after we have escaped the EuiFocusTrap
      restoreFocusTo.current?.focus();
    }, 0);
  }, [onHide, restoreFocusTo]);

  const resetColumns = useCallback(() => {
    onResetColumns();
    closeAndRestoreFocus();
  }, [closeAndRestoreFocus, onResetColumns]);

  /** Invoked when the user types in the input to filter the field browser */
  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchInputChange(event.target.value);
    },
    [onSearchInputChange]
  );

  const [CreateFieldButton, getFieldTableColumns] = [
    options?.createFieldButton,
    options?.getFieldTableColumns,
  ];

  return (
    <EuiModal onClose={closeAndRestoreFocus} style={{ width, maxWidth: width }}>
      <div data-test-subj="fields-browser-container" className="eui-yScroll">
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.FIELDS_BROWSER}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <Search
                data-test-subj="header"
                isSearching={isSearching}
                onSearchInputChange={onInputChange}
                searchInput={searchInput}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CategoriesSelector
                filteredBrowserFields={filteredBrowserFields}
                setSelectedCategoryIds={setSelectedCategoryIds}
                selectedCategoryIds={selectedCategoryIds}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {CreateFieldButton && <CreateFieldButton onHide={onHide} />}
            </EuiFlexItem>
          </EuiFlexGroup>

          <CategoriesBadges
            selectedCategoryIds={selectedCategoryIds}
            setSelectedCategoryIds={setSelectedCategoryIds}
          />

          <EuiSpacer size="l" />

          <FieldTable
            columnIds={columnIds}
            filteredBrowserFields={filteredBrowserFields}
            filterSelectedEnabled={filterSelectedEnabled}
            searchInput={appliedFilterInput}
            selectedCategoryIds={selectedCategoryIds}
            onFilterSelectedChange={onFilterSelectedChange}
            onToggleColumn={onToggleColumn}
            getFieldTableColumns={getFieldTableColumns}
            onHide={onHide}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              className={RESET_FIELDS_CLASS_NAME}
              data-test-subj="reset-fields"
              onClick={resetColumns}
            >
              {i18n.RESET_FIELDS}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={closeAndRestoreFocus}
              aria-label={i18n.CLOSE}
              className={CLOSE_BUTTON_CLASS_NAME}
              data-test-subj="close"
            >
              {i18n.CLOSE}
            </EuiButton>
          </EuiFlexItem>
        </EuiModalFooter>
      </div>
    </EuiModal>
  );
};

export const FieldBrowserModal = React.memo(FieldBrowserModalComponent);
