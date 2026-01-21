/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiNotificationBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

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
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [isIntegrationPopoverOpen, setIsIntegrationPopoverOpen] = useState(false);
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
      setSelectedIntegrations([]);
      setIsFilterPopoverOpen(false);
      setIsIntegrationPopoverOpen(false);
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

  // Extract unique integration names from integration items
  const availableIntegrations = useMemo(() => {
    const integrationSet = new Set<string>();
    items.forEach((item) => {
      const typeKey = getTypeKey(item);
      if (typeKey === 'integration') {
        const integrationName = (item as any).integrationName;
        if (integrationName) {
          integrationSet.add(integrationName);
        }
      }
    });
    return Array.from(integrationSet).sort();
  }, [items, getTypeKey]);

  // Count items per integration
  const integrationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const typeKey = getTypeKey(item);
      if (typeKey === 'integration') {
        const integrationName = (item as any).integrationName;
        if (integrationName) {
          counts.set(integrationName, (counts.get(integrationName) ?? 0) + 1);
        }
      }
    });
    return counts;
  }, [items, getTypeKey]);

  // Create integration filter options
  const integrationFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableIntegrations.map((integrationName) => ({
      key: integrationName,
      label: integrationName,
      checked: selectedIntegrations.includes(integrationName) ? ('on' as const) : undefined,
      append: (
        <EuiNotificationBadge color="subdued" size="m">
          {integrationCounts.get(integrationName) ?? 0}
        </EuiNotificationBadge>
      ),
    }));
  }, [availableIntegrations, selectedIntegrations, integrationCounts]);

  const options: EuiSelectableOption[] = useMemo(() => {
    return createOptions(items, selectedItems);
  }, [items, selectedItems, createOptions]);

  const filteredOptions = useMemo(() => {
    let filtered = options;

    // Filter by search value
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter((option) => option.label?.toLowerCase().includes(searchLower));
    }

    // Filter by selected types and integrations
    if (selectedTypes.length > 0 || selectedIntegrations.length > 0) {
      filtered = filtered.filter((option) => {
        // Check if option has typeKey in data (set by createOptions)
        const typeKey = option.data?.typeKey as string | undefined;

        if (typeKey === 'integration') {
          const integrationName = option.data?.integrationName as string | undefined;
          return integrationName && selectedIntegrations.includes(integrationName);
        }

        if (!typeKey || !selectedTypes.includes(typeKey)) {
          return false;
        }

        return true;
      });
    }

    return filtered;
  }, [options, searchValue, selectedTypes, selectedIntegrations]);

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

  const handleTypeFilterChange = useCallback(
    (newOptions: EuiSelectableOption[], changedOption: EuiSelectableOption | undefined) => {
      if (changedOption?.key === 'integration') {
        setIsIntegrationPopoverOpen(true);
      } else {
        const selected = newOptions
          .filter((opt) => opt.checked === 'on')
          .map((opt) => opt.key as string);
        setSelectedTypes(selected);
      }
    },
    []
  );

  const handleIntegrationFilterChange = useCallback((newOptions: EuiSelectableOption[]) => {
    const selected = newOptions
      .filter((opt) => opt.checked === 'on')
      .map((opt) => opt.key as string);
    setSelectedIntegrations(selected);
  }, []);

  const filterButton = (
    <EuiButtonIcon
      iconType="filter"
      onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
      aria-label={i18nKeys.filterTitle}
      buttonRef={setFilterButtonRef}
      size="s"
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

  // Create filter options for the type filter popover
  const typeFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableTypes.map((typeKey) => {
      const isIntegration = typeKey === 'integration';
      const hasIntegrations = availableIntegrations.length > 0;

      return {
        key: typeKey,
        label: getTypeLabel(typeKey),
        checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
        prepend: getTypeIcon?.(typeKey),
        append: (
          <>
            {isIntegration && hasIntegrations ? (
              <EuiIcon type="arrowRight" />
            ) : (
              <EuiNotificationBadge color="subdued" size="m">
                {typeCounts.get(typeKey) ?? 0}
              </EuiNotificationBadge>
            )}
          </>
        ),
      };
    });
  }, [
    availableTypes,
    selectedTypes,
    getTypeLabel,
    getTypeIcon,
    typeCounts,
    availableIntegrations.length,
  ]);

  const renderTypeOption = useCallback(
    (option: EuiSelectableOption) => {
      const isIntegration = option.key === 'integration';
      const hasIntegrations = availableIntegrations.length > 0;
      return isIntegration && hasIntegrations ? (
        <EuiPopover
          button={option.label}
          isOpen={isIntegrationPopoverOpen}
          closePopover={() => {
            setIsIntegrationPopoverOpen(false);
          }}
          panelPaddingSize="none"
          offset={-35} // Move popover up to align with the filter button
          panelStyle={{ transform: `translateX(215px)` }}
        >
          <EuiSelectable
            options={integrationFilterOptions}
            onChange={handleIntegrationFilterChange}
            listProps={{
              bordered: false,
            }}
          >
            {(integrationList) => (
              <div css={filterListStyles} style={{ width: 250, maxHeight: 250, overflowY: 'auto' }}>
                {integrationList}
              </div>
            )}
          </EuiSelectable>
        </EuiPopover>
      ) : (
        option.label
      );
    },
    [
      isIntegrationPopoverOpen,
      availableIntegrations,
      integrationFilterOptions,
      handleIntegrationFilterChange,
      filterListStyles,
    ]
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
              panelStyle={{ transform: `translateX(45px)` }}
              offset={-35} // Move popover up to align with the filter button
            >
              <EuiPopoverTitle paddingSize="s">{i18nKeys.filterTitle}</EuiPopoverTitle>
              <EuiSelectable
                options={typeFilterOptions}
                onChange={(newOptions, event, changedOption) =>
                  handleTypeFilterChange(newOptions, changedOption)
                }
                renderOption={renderTypeOption}
                listProps={{
                  bordered: false, // Doesn't work so we overwrite the border style with filterListStyles
                }}
              >
                {(list) => (
                  <div
                    css={filterListStyles}
                    style={{ width: 250, maxHeight: 250, overflowY: 'auto' }}
                  >
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
            <div style={{ padding: euiTheme.size.s }}>{search}</div>
            <div style={{ maxHeight: BROWSER_POPOVER_HEIGHT - 100, overflowY: 'auto' }}>{list}</div>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
}
