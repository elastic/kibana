/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';

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
import React, { useState, useEffect, useCallback, useRef } from 'react';

export const BROWSER_POPOVER_WIDTH = 400;
export const BROWSER_POPOVER_HEIGHT = 500;

const filterPopoverStyle = ({ euiTheme }: UseEuiTheme) => css`
  .euiFilterButton__wrapper {
    ${logicalCSS('left', `-${euiTheme.size.s}`)}
    ${logicalCSS('min-width', '0')}
    ${logicalCSS('width', `calc(100% + ${mathWithUnits(euiTheme.size.s, (x) => x * 2)})`)}

    &::before {
      display: none;
    }
  }
`;

const filterButtonStyle = ({ euiTheme }: UseEuiTheme) => css`
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
  onSelect: (options: EuiSelectableOption[]) => void;
  position?: { top?: number; left?: number };
  // Data fetching
  fetchData: () => Promise<TItem[]>;
  // Type extraction
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
}

export function BrowserPopoverWrapper<TItem extends { name: string }>({
  items,
  isOpen,
  onClose,
  onSelect,
  position,
  fetchData,
  i18nKeys,
  numTypes,
  numActiveFilters,
  filterPanel,
  isLoading,
  searchValue,
  setSearchValue,
}: BrowserPopoverWrapperProps<TItem>) {
  const { euiTheme } = useEuiTheme();
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const closeButtonRef = useRef<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLElement | null>(null);
  const setSearchInputRef = useCallback((node: HTMLInputElement | null) => {
    searchInputRef.current = node;
  }, []);

  const setCloseButtonRef = useCallback((node: HTMLElement | null) => {
    closeButtonRef.current = node;
  }, []);

  const setFilterButtonRef = useCallback((node: HTMLElement | null) => {
    filterButtonRef.current = node;
  }, []);

  // Find the actual button elements after render
  useEffect(() => {
    if (isOpen) {
      // Find close button
      if (closeButtonRef.current) {
        const button = closeButtonRef.current.querySelector('button');
        if (button) {
          closeButtonRef.current = button as HTMLElement;
        }
      }
      // Find filter button
      if (filterButtonRef.current) {
        const button = filterButtonRef.current.querySelector('button');
        if (button) {
          filterButtonRef.current = button as HTMLElement;
        }
      }
    }
  }, [isOpen]);

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
      isSelected={isFilterPopoverOpen}
      numFilters={numTypes}
      hasActiveFilters={numActiveFilters > 0}
      numActiveFilters={numActiveFilters}
      css={filterButtonStyle}
      onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
      buttonRef={setFilterButtonRef}
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
              css={filterPopoverStyle}
              button={filterButton}
              isOpen={isFilterPopoverOpen}
              closePopover={() => setIsFilterPopoverOpen(false)}
              panelStyle={{ transform: `translateX(60px)` }}
              offset={-35} // Move popover up to align with the filter button
            >
              {filterPanel}
            </EuiPopover>
          ),
        }}
        options={items}
        onChange={onSelect}
        isLoading={isLoading}
        loadingMessage={i18nKeys.loading}
        emptyMessage={i18nKeys.empty}
        noMatchesMessage={i18nKeys.noMatches}
        listProps={{
          truncationProps: {
            truncation: 'middle',
          },
        }}
      >
        {(list, search) => (
          <div style={{ width: BROWSER_POPOVER_WIDTH, maxHeight: BROWSER_POPOVER_HEIGHT }}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>{i18nKeys.title}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    aria-label={i18nKeys.closeLabel}
                    onClick={onClose}
                    buttonRef={setCloseButtonRef}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            <div style={{ padding: euiTheme.size.s }}>{search}</div>
            <div style={{ maxHeight: BROWSER_POPOVER_HEIGHT - 100, overflowY: 'auto' }}>{list}</div>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
