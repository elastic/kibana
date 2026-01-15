/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiFilterButton,
  EuiNotificationBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';

export const BROWSER_POPOVER_WIDTH = 400;
export const BROWSER_POPOVER_HEIGHT = 500;

export interface BrowserPopoverWrapperProps<TItem> {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedItems: string, oldLength: number) => void;
  position?: { top?: number; left?: number };
  // Data fetching
  fetchData: () => Promise<TItem[]>;
  // Type extraction
  getTypeKey: (item: TItem) => string;
  getTypeLabel: (typeKey: string) => string;
  getTypeIcon?: (typeKey: string) => ReactNode;
  // Option creation
  createOptions: (items: TItem[], selectedItems: string[]) => EuiSelectableOption[];
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
}

export function BrowserPopoverWrapper<TItem extends { name: string }>({
  isOpen,
  onClose,
  onSelect,
  position,
  fetchData,
  getTypeKey,
  getTypeLabel,
  getTypeIcon,
  createOptions,
  i18nKeys,
}: BrowserPopoverWrapperProps<TItem>) {
  const { euiTheme } = useEuiTheme();
  const [items, setItems] = useState<TItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
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

  // Reset state when popover opens
  useEffect(() => {
    if (isOpen) {
      // Clear all selections and filters when popover opens
      setSelectedItems([]);
      setSearchValue('');
      setSelectedTypes([]);
      setIsFilterPopoverOpen(false);
    }
  }, [isOpen]);

  // Fetch data when popover opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchData()
        .then((fetchedItems) => {
          setItems(fetchedItems);
          setIsLoading(false);
        })
        .catch(() => {
          setItems([]);
          setIsLoading(false);
        });
    }
  }, [isOpen, fetchData]);

  // Focus the search input when popover opens
  useEffect(() => {
    if (isOpen && !isLoading) {
      // Use setTimeout to ensure the DOM is ready
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, isLoading]);

  // Get unique types from items
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    items.forEach((item) => {
      const typeKey = getTypeKey(item);
      typeSet.add(typeKey);
    });
    return Array.from(typeSet).sort();
  }, [items, getTypeKey]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const typeKey = getTypeKey(item);
      counts.set(typeKey, (counts.get(typeKey) ?? 0) + 1);
    });
    return counts;
  }, [items, getTypeKey]);

  // Create filter options for the type filter popover
  const typeFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableTypes.map((typeKey) => ({
      key: typeKey,
      label: getTypeLabel(typeKey),
      checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
      prepend: getTypeIcon?.(typeKey),
      append: (
        <EuiNotificationBadge color="subdued" size="m">
          {typeCounts.get(typeKey) ?? 0}
        </EuiNotificationBadge>
      ),
    }));
  }, [availableTypes, selectedTypes, getTypeLabel, getTypeIcon, typeCounts]);

  const options: EuiSelectableOption[] = useMemo(() => {
    return createOptions(items, selectedItems);
  }, [items, selectedItems, createOptions]);

  const filteredOptions = useMemo(() => {
    let filtered = options;

    // Filter by search value
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter((option) =>
        option.label?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by selected types
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((option) => {
        // Check if option has typeKey in data (set by createOptions)
        const typeKey = option.data?.typeKey as string | undefined;
        return typeKey && selectedTypes.includes(typeKey);
      });
    }

    return filtered;
  }, [options, searchValue, selectedTypes]);

  const handleSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newlySelected = newOptions
        .filter((o) => o.checked === 'on')
        .map((o) => o.key as string)
        .filter(Boolean);

      const oldLength = selectedItems.join(',').length;
      setSelectedItems(newlySelected);
      onSelect(newlySelected.join(','), oldLength);
    },
    [onSelect, selectedItems]
  );

  const handleTypeFilterChange = useCallback((newOptions: EuiSelectableOption[]) => {
    const selected = newOptions
      .filter((opt) => opt.checked === 'on')
      .map((opt) => opt.key as string);
    setSelectedTypes(selected);
  }, []);

  const filterButton = (
    <EuiFilterButton
      iconType="filter"
      isSelected={isFilterPopoverOpen}
      hasActiveFilters={selectedTypes.length > 0}
      onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
      aria-label={i18nKeys.filterTitle}
      buttonRef={setFilterButtonRef}
      grow={false}
    />
  );

    // Overwriting the border style as setting listProps.bordered to false doesn't work
    const filterListStyles = useMemo(
      () => css`
        .euiSelectableListItem {
          border-top: none;
          border-bottom: none;
        }
      `,
      []
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
                button={filterButton}
                isOpen={isFilterPopoverOpen}
                closePopover={() => setIsFilterPopoverOpen(false)}
                panelPaddingSize="none"
                panelStyle={{ transform: `translateX(${euiTheme.size.xxxl})` }}
              >
                <EuiPopoverTitle paddingSize="s">{i18nKeys.filterTitle}</EuiPopoverTitle>
                <EuiSelectable
                  options={typeFilterOptions}
                  onChange={handleTypeFilterChange}
                  listProps={{
                    bordered: false, // Doesn't work so we overwrite the border style with filterListStyles
                  }}
                >
                  {(list) => (
                    <div css={filterListStyles} style={{ width: 250, maxHeight: 250, overflowY: 'auto' }}>
                      {list}
                    </div>
                  )}
                </EuiSelectable>
              </EuiPopover>
            ),
          }}
          options={filteredOptions}
          onChange={handleSelectionChange}
          isLoading={isLoading}
          loadingMessage={i18nKeys.loading}
          emptyMessage={i18nKeys.empty}
          noMatchesMessage={i18nKeys.noMatches}
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
              {search}
              <div style={{ maxHeight: BROWSER_POPOVER_HEIGHT - 100, overflowY: 'auto' }}>{list}</div>
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
  );
}

