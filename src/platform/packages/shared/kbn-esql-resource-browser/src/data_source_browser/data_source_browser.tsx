/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiNotificationBadge,
  EuiPopoverTitle,
  EuiSelectable,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { BrowserPopoverWrapper } from '../browser_popover_wrapper';
import { getSourceTypeKey, getSourceTypeLabel } from './utils';
import { DATA_SOURCE_BROWSER_I18N_KEYS } from './i18n';
import { DataSourceSelectionChange } from '../types';

// Filter panel size constants
const FILTER_PANEL_WIDTH = 250; // Width in pixels for the filter panel lists
const FILTER_PANEL_MAX_HEIGHT = 250; // Maximum height in pixels for the filter panel lists

interface DataSourceBrowserProps {
  isOpen: boolean;
  isLoading: boolean;
  allSources: ESQLSourceResult[];
  selectedSources?: string[];
  onClose: () => void;
  onSelect: (sourceName: string, change: DataSourceSelectionChange) => void;
  position?: { top?: number; left?: number };
}

export const DataSourceBrowser: React.FC<DataSourceBrowserProps> = ({
  isOpen,
  isLoading,
  allSources,
  selectedSources = [],
  onClose,
  onSelect,
  position,
}) => {
  const { euiTheme } = useEuiTheme();

  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isIntegrationPopoverOpen, setIsIntegrationPopoverOpen] = useState(false);

  // Reset state when popover opens and pre-select initial sources
  useEffect(() => {
    if (isOpen) {
      // Clear filters when popover opens
      setSelectedTypes([]);
      setSelectedIntegrations([]);
      setSearchValue('');
      setIsIntegrationPopoverOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isFilterPopoverOpen) {
      setIsIntegrationPopoverOpen(false);
    }
  }, [isFilterPopoverOpen]);

  // Get unique types from allSources
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    allSources.forEach((source) => {
      const typeKey = getSourceTypeKey(source.type);
      typeSet.add(typeKey);
    });
    return Array.from(typeSet).sort();
  }, [allSources]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allSources.forEach((source) => {
      const typeKey = getSourceTypeKey(source.type);
      counts.set(typeKey, (counts.get(typeKey) ?? 0) + 1);
    });
    return counts;
  }, [allSources]);

  // Extract unique integration names from integration items
  const availableIntegrations = useMemo(() => {
    const integrationSet = new Set<string>();
    allSources.forEach((source) => {
      const typeKey = getSourceTypeKey(source.type);
      if (typeKey === 'integration') {
        const integrationName = source.title;
        if (integrationName) {
          integrationSet.add(integrationName);
        }
      }
    });
    return Array.from(integrationSet).sort();
  }, [allSources]);

  // Count items per integration
  const integrationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allSources.forEach((source) => {
      const typeKey = getSourceTypeKey(source.type);
      if (typeKey === 'integration') {
        const integrationName = source.title;
        if (integrationName) {
          counts.set(integrationName, (counts.get(integrationName) ?? 0) + 1);
        }
      }
    });
    return counts;
  }, [allSources]);

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
    return allSources.map((source) => ({
      key: source.name,
      label: source.name,
      checked: selectedSources.includes(source.name) ? ('on' as const) : undefined,
      append: <EuiTextColor color="subdued">{getSourceTypeLabel(source.type)}</EuiTextColor>,
      data: {
        type: source.type,
        typeKey: getSourceTypeKey(source.type),
        title: source.title,
      },
    }));
  }, [allSources, selectedSources]);

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

        if (typeKey === 'integration' && availableIntegrations.length > 0) {
          const integrationName = option.data?.title as string | undefined;
          return integrationName && selectedIntegrations.includes(integrationName);
        }

        if (!typeKey || !selectedTypes.includes(typeKey)) {
          return false;
        }

        return true;
      });
    }

    return filtered;
  }, [options, searchValue, selectedTypes, selectedIntegrations, availableIntegrations.length]);

  const handleSelectionChange = useCallback(
    (changedOption: EuiSelectableOption | undefined) => {
      if (!changedOption?.key) return;

      const key = changedOption.key as string;
      const isAdding = changedOption.checked === 'on';

      onSelect(key, isAdding ? DataSourceSelectionChange.Add : DataSourceSelectionChange.Remove);
    },
    [onSelect]
  );

  const handleTypeFilterChange = (
    newOptions: EuiSelectableOption[],
    changedOption: EuiSelectableOption | undefined
  ) => {
    if (changedOption?.key === 'integration') {
      setIsIntegrationPopoverOpen(true);
    } else {
      const selected = newOptions
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key as string);
      setSelectedTypes(selected);
    }
  };

  const handleIntegrationFilterChange = (newOptions: EuiSelectableOption[]) => {
    const selected = newOptions
      .filter((opt) => opt.checked === 'on')
      .map((opt) => opt.key as string);
    setSelectedIntegrations(selected);
  };

  // Overwriting the border style as setting listProps.bordered to false doesn't work
  const filterListStyles = css`
    .euiSelectableListItem {
      border-top: none;
      border-bottom: none;
    }
  `;

  // Create filter options for the type filter popover
  const typeFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableTypes.map((typeKey) => {
      const isIntegration = typeKey === 'integration';
      const hasIntegrations = availableIntegrations.length > 0;

      return {
        key: typeKey,
        label: getSourceTypeLabel(typeKey),
        checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
        append: (
          <>
            {isIntegration && hasIntegrations ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                {selectedIntegrations.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge color="accent" size="s">
                      {selectedIntegrations.length}
                    </EuiNotificationBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiIcon type="arrowRight" />
                </EuiFlexItem>
              </EuiFlexGroup>
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
    typeCounts,
    availableIntegrations.length,
    selectedIntegrations,
  ]);

  const filterPanel = isIntegrationPopoverOpen ? (
    <>
      <EuiPopoverTitle paddingSize="s" onClick={() => setIsIntegrationPopoverOpen(false)}>
        <EuiIcon type="arrowLeft" />
        <EuiLink
          color="text"
          css={css`
            padding-left: ${euiTheme.size.s};
          `}
        >
          {DATA_SOURCE_BROWSER_I18N_KEYS.integrationFilterTitle}
        </EuiLink>
      </EuiPopoverTitle>
      <EuiSelectable
        options={integrationFilterOptions}
        onChange={handleIntegrationFilterChange}
        listProps={{
          bordered: false,
        }}
      >
        {(integrationList) => (
          <div
            css={filterListStyles}
            style={{
              width: `${FILTER_PANEL_WIDTH}px`,
              maxHeight: FILTER_PANEL_MAX_HEIGHT,
              overflowY: 'auto',
            }}
          >
            {integrationList}
          </div>
        )}
      </EuiSelectable>
    </>
  ) : (
    <>
      <EuiPopoverTitle paddingSize="s">{DATA_SOURCE_BROWSER_I18N_KEYS.filterTitle}</EuiPopoverTitle>
      <EuiSelectable
        options={typeFilterOptions}
        onChange={(newOptions, event, changedOption) =>
          handleTypeFilterChange(newOptions, changedOption)
        }
        listProps={{
          bordered: false, // Doesn't work so we overwrite the border style with filterListStyles
        }}
      >
        {(list) => (
          <div
            css={filterListStyles}
            style={{
              width: `${FILTER_PANEL_WIDTH}px`,
              maxHeight: FILTER_PANEL_MAX_HEIGHT,
              overflowY: 'auto',
            }}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </>
  );

  return (
    <BrowserPopoverWrapper
      items={filteredOptions}
      numActiveFilters={selectedTypes.length + selectedIntegrations.length}
      filterPanel={filterPanel}
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleSelectionChange}
      isFilterOpen={isFilterPopoverOpen}
      setIsFilterOpen={setIsFilterPopoverOpen}
      position={position}
      i18nKeys={DATA_SOURCE_BROWSER_I18N_KEYS}
      numTypes={availableTypes.length + availableIntegrations.length}
      isLoading={isLoading}
      searchValue={searchValue}
      setSearchValue={setSearchValue}
    />
  );
};
