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
  EuiIcon,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';

const POPOVER_WIDTH = 400;
const POPOVER_HEIGHT = 500;

export interface BrowserPopoverWrapperProps<TItem> {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedItems: string, oldLength: number) => void;
  anchorElement?: HTMLElement;
  position?: { top?: number; left?: number };
  // Data fetching
  fetchData: () => Promise<TItem[]>;
  // Type extraction
  getTypeKey: (item: TItem) => string;
  getTypeLabel: (typeKey: string) => string;
  // Option creation
  createOptions: (items: TItem[], selectedItems: string[]) => EuiSelectableOption[];
  // i18n keys
  i18nKeys: {
    title: string;
    searchPlaceholder: string;
    filterTitle: string;
    filterSearchPlaceholder: string;
    filterByType: string;
    closeLabel: string;
    loading: string;
    empty: string;
    noMatches: string;
  };
  // Custom renderers
  renderFilterButtonIcon?: () => ReactNode;
  renderOptionAppend?: (item: TItem) => ReactNode;
  renderOptionPrepend?: (item: TItem) => ReactNode;
}

export function BrowserPopoverWrapper<TItem extends { name: string }>({
  isOpen,
  onClose,
  onSelect,
  anchorElement,
  position,
  fetchData,
  getTypeKey,
  getTypeLabel,
  createOptions,
  i18nKeys,
  renderFilterButtonIcon,
  renderOptionAppend,
  renderOptionPrepend,
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

  // Create filter options for the type filter popover
  const typeFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableTypes.map((typeKey) => ({
      key: typeKey,
      label: getTypeLabel(typeKey),
      checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
    }));
  }, [availableTypes, selectedTypes, getTypeLabel]);

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
      iconType="arrowDown"
      isSelected={isFilterPopoverOpen}
      hasActiveFilters={selectedTypes.length > 0}
      numActiveFilters={selectedTypes.length}
      onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
      aria-label={i18nKeys.filterByType}
      buttonRef={setFilterButtonRef}
    >
      {renderFilterButtonIcon ? renderFilterButtonIcon() : <EuiIcon type="filter" />}
    </EuiFilterButton>
  );

  const button = anchorElement ? undefined : <div style={{ display: 'none' }} />;

  return (
    <div
      style={{
        ...position,
        backgroundColor: euiTheme.colors.emptyShade,
        borderRadius: euiTheme.border.radius.small,
        position: 'absolute',
        overflowY: 'auto',
        maxHeight: '400px',
        outline: 'none',
        zIndex: 1001,
        border: euiTheme.border.thin,
      }}
      tabIndex={-1}
      role="button"
    >
      <EuiPopover
        button={button}
        isOpen={isOpen}
        closePopover={onClose}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        panelStyle={{
          width: POPOVER_WIDTH,
          maxHeight: POPOVER_HEIGHT,
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
                anchorPosition="downRight"
              >
                <EuiSelectable
                  searchable
                  searchProps={{
                    placeholder: i18nKeys.filterSearchPlaceholder,
                    compressed: true,
                  }}
                  options={typeFilterOptions}
                  onChange={handleTypeFilterChange}
                >
                  {(list, search) => (
                    <div style={{ width: 250, maxHeight: 300 }}>
                      <EuiPopoverTitle paddingSize="s">{i18nKeys.filterTitle}</EuiPopoverTitle>
                      {search}
                      <div style={{ maxHeight: 250, overflowY: 'auto' }}>{list}</div>
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
            <div style={{ width: POPOVER_WIDTH, maxHeight: POPOVER_HEIGHT }}>
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
              <div style={{ maxHeight: POPOVER_HEIGHT - 100, overflowY: 'auto' }}>{list}</div>
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </div>
  );
}

