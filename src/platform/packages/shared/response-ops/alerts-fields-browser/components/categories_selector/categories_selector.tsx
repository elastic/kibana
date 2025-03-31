/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { omit } from 'lodash';
import {
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiPopover,
  EuiSelectable,
  FilterChecked,
} from '@elastic/eui';
import type { BrowserFields } from '@kbn/rule-registry-plugin/common';
import * as i18n from '../../translations';
import { getFieldCount, isEscape } from '../../helpers';
import { styles } from './categories_selector.styles';

interface CategoriesSelectorProps {
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  /** The category selected on the left-hand side of the field browser */
  selectedCategoryIds: string[];
}

interface CategoryOption {
  label: string;
  count: number;
  checked?: FilterChecked;
}

const renderOption = (option: CategoryOption, searchValue: string) => {
  const { label, count, checked } = option;
  // Some category names have spaces, but test selectors don't like spaces,
  // Tests are not able to find subjects with spaces, so we need to clean them.
  const idAttr = label.replace(/\s/g, '');
  return (
    <EuiFlexGroup
      data-test-subj={`categories-selector-option-${idAttr}`}
      alignItems="center"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <span
          css={styles.categoryName({ bold: checked === 'on' })}
          data-test-subj={`categories-selector-option-name-${idAttr}`}
        >
          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge css={styles.countBadge}>{count}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CategoriesSelectorComponent: React.FC<CategoriesSelectorProps> = ({
  filteredBrowserFields,
  setSelectedCategoryIds,
  selectedCategoryIds,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const totalCategories = useMemo(
    () => Object.keys(filteredBrowserFields).length,
    [filteredBrowserFields]
  );

  const categoryOptions: CategoryOption[] = useMemo(() => {
    const unselectedCategoryIds = Object.keys(
      omit(filteredBrowserFields, selectedCategoryIds)
    ).sort();
    return [
      ...selectedCategoryIds.map((categoryId) => ({
        label: categoryId,
        count: getFieldCount(filteredBrowserFields[categoryId]),
        checked: 'on',
      })),
      ...unselectedCategoryIds.map((categoryId) => ({
        label: categoryId,
        count: getFieldCount(filteredBrowserFields[categoryId]),
      })),
    ];
  }, [selectedCategoryIds, filteredBrowserFields]);

  const onCategoriesChange = useCallback(
    (options: CategoryOption[]) => {
      setSelectedCategoryIds(
        options.filter(({ checked }) => checked === 'on').map(({ label }) => label)
      );
    },
    [setSelectedCategoryIds]
  );

  const onKeyDown = useCallback((keyboardEvent: React.KeyboardEvent) => {
    if (isEscape(keyboardEvent)) {
      // Prevent escape to close the field browser modal after closing the category selector
      keyboardEvent.stopPropagation();
    }
  }, []);

  return (
    <EuiFilterGroup data-test-subj="categories-selector">
      <EuiPopover
        button={
          <EuiFilterButton
            data-test-subj="categories-filter-button"
            hasActiveFilters={selectedCategoryIds.length > 0}
            iconType="arrowDown"
            isSelected={isPopoverOpen}
            numActiveFilters={selectedCategoryIds.length}
            numFilters={totalCategories}
            onClick={togglePopover}
          >
            {i18n.CATEGORIES}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <div
          css={styles.selectableContainer}
          onKeyDown={onKeyDown}
          data-test-subj="categories-selector-container"
        >
          <EuiSelectable
            aria-label="Searchable categories"
            searchable
            searchProps={{
              'data-test-subj': 'categories-selector-search',
            }}
            options={categoryOptions}
            renderOption={renderOption}
            onChange={onCategoriesChange}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const CategoriesSelector = React.memo(CategoriesSelectorComponent);
