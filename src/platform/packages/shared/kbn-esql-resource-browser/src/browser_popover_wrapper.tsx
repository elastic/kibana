/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, EuiThemeComputed } from '@elastic/eui';

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiFilterButton,
  EuiIcon,
  logicalCSS,
  mathWithUnits,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';

export const BROWSER_POPOVER_WIDTH = 400;
export const BROWSER_POPOVER_HEIGHT = 500;
export const MAX_LIST_HEIGHT = 250;

// Filter popover positioning constants
const FILTER_POPOVER_HORIZONTAL_OFFSET = 60; // Horizontal offset in pixels for the filter popover
const FILTER_POPOVER_VERTICAL_OFFSET = -35; // Vertical offset in pixels to align with the filter button

const filterPopoverStyle = (euiTheme: EuiThemeComputed) => css`
  .euiFilterButton__wrapper {
    ${logicalCSS('left', `-${euiTheme.size.s}`)}
    ${logicalCSS('min-width', '0')}
    ${logicalCSS('width', `calc(100% + ${mathWithUnits(euiTheme.size.s, (x) => x * 2)})`)}

    &::before {
      display: none;
    }
  }
`;

const filterButtonStyle = css`
  padding: 0;

  &,
  & .euiFilterButton__text {
    min-width: 0;
    line-height: 1;
  }
`;

export interface BrowserPopoverWrapperProps<TItem> {
  items: EuiSelectableOption[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (changedOption: EuiSelectableOption | undefined) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (isOpen: boolean) => void;
  position?: { top?: number; left?: number };
  // i18n keys
  i18nKeys: {
    title: string;
    searchPlaceholder: string;
    filterTitle: string;
    closeLabel: string;
    loading: string;
    empty: string;
    noMatches: string;
  };
  numTypes: number;
  numActiveFilters: number;
  filterPanel: ReactNode;
  isLoading: boolean;
  searchValue: string;
  setSearchValue: (value: string) => void;
  isMultiSelect?: boolean;
}

export function BrowserPopoverWrapper<TItem extends { name: string }>({
  items,
  isOpen,
  onClose,
  onSelect,
  isFilterOpen,
  setIsFilterOpen,
  position,
  i18nKeys,
  numTypes,
  numActiveFilters,
  filterPanel,
  isLoading,
  searchValue,
  setSearchValue,
  isMultiSelect = true,
}: BrowserPopoverWrapperProps<TItem>) {
  const { euiTheme } = useEuiTheme();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const setSearchInputRef = (node: HTMLInputElement | null) => {
    searchInputRef.current = node;
  };

  // Focus the search input when popover opens
  useEffect(() => {
    if (isOpen && !isLoading) {
      // Use setTimeout to ensure the DOM is ready
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, isLoading]);

  const filterButton = (
    <EuiFilterButton
      aria-label={i18nKeys.filterTitle}
      color="text"
      isSelected={isFilterOpen}
      numFilters={numTypes}
      hasActiveFilters={numActiveFilters > 0}
      numActiveFilters={numActiveFilters}
      css={filterButtonStyle}
      onClick={() => setIsFilterOpen(!isFilterOpen)}
    >
      <EuiIcon type="filter" />
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={<div style={{ display: 'none' }} />}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      panelStyle={{
        width: BROWSER_POPOVER_WIDTH,
        maxHeight: BROWSER_POPOVER_HEIGHT,
        overflowY: 'auto',
      }}
      style={{
        ...position,
        position: 'absolute',
      }}
    >
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: i18nKeys.searchPlaceholder,
          compressed: true,
          value: searchValue,
          onChange: (value) => setSearchValue(value),
          inputRef: setSearchInputRef,
          append: (
            <EuiPopover
              id="esqlResourceBrowserFilterPopover"
              panelPaddingSize="none"
              display="block"
              css={filterPopoverStyle(euiTheme)}
              button={filterButton}
              isOpen={isFilterOpen}
              closePopover={() => setIsFilterOpen(false)}
              panelStyle={{ transform: `translateX(${FILTER_POPOVER_HORIZONTAL_OFFSET}px)` }}
              offset={FILTER_POPOVER_VERTICAL_OFFSET}
            >
              {filterPanel}
            </EuiPopover>
          ),
        }}
        options={items}
        onChange={(newOptions, event, changedOption) => onSelect(changedOption)}
        isLoading={isLoading}
        loadingMessage={i18nKeys.loading}
        emptyMessage={i18nKeys.empty}
        noMatchesMessage={i18nKeys.noMatches}
        listProps={{
          truncationProps: {
            truncation: 'middle',
          },
        }}
        singleSelection={!isMultiSelect}
      >
        {(list, search) => (
          <div style={{ width: BROWSER_POPOVER_WIDTH, maxHeight: BROWSER_POPOVER_HEIGHT }}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem>{i18nKeys.title}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    aria-label={i18nKeys.closeLabel}
                    onClick={onClose}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            <div style={{ padding: euiTheme.size.s }}>{search}</div>
            <div style={{ maxHeight: MAX_LIST_HEIGHT, overflowY: 'auto' }}>{list}</div>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
