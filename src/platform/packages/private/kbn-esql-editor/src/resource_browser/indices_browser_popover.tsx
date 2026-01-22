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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { getESQLSources } from '@kbn/esql-utils';
import type { CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import { BrowserPopoverWrapper } from './browser_popover_wrapper';

const getSourceTypeLabel = (type?: string): string => {
  if (!type) return 'Index';
  const typeLower = type.toLowerCase();
  if (typeLower.includes('index') && !typeLower.includes('lookup')) return 'Index';
  if (typeLower.includes('alias')) return 'Alias';
  if (typeLower.includes('stream') || typeLower.includes('data stream')) return 'Stream';
  if (typeLower.includes('integration')) return 'Integration';
  if (typeLower.includes('lookup')) return 'Lookup Index';
  if (typeLower.includes('timeseries') || typeLower.includes('time series')) return 'Timeseries';
  return type;
};

const getSourceTypeKey = (type?: string): string => {
  if (!type) return 'index';
  const typeLower = type.toLowerCase();
  if (typeLower.includes('index') && !typeLower.includes('lookup')) return 'index';
  if (typeLower.includes('alias')) return 'alias';
  if (typeLower.includes('stream') || typeLower.includes('data stream')) return 'stream';
  if (typeLower.includes('integration')) return 'integration';
  if (typeLower.includes('lookup')) return 'lookup_index';
  if (typeLower.includes('timeseries') || typeLower.includes('time series')) return 'timeseries';
  return 'index';
};

interface IndicesBrowserPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (indexName: string, oldLength: number) => void;
  core: CoreStart;
  getLicense?: () => Promise<ILicense | undefined>;
  position?: { top?: number; left?: number };
}

export const IndicesBrowserPopover: React.FC<IndicesBrowserPopoverProps> = ({
  isOpen,
  onClose,
  onSelectIndex,
  core,
  getLicense,
  position,
}) => {
  const [items, setItems] = useState<ESQLSourceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [isIntegrationPopoverOpen, setIsIntegrationPopoverOpen] = useState(false);

  // Reset state when popover opens
  useEffect(() => {
    if (isOpen) {
      // Clear all selections and filters when popover opens
      setSelectedTypes([]);
      setSelectedItems([]);
      setSelectedIntegrations([]);
      setSearchValue('');
      setIsIntegrationPopoverOpen(false);
    }
  }, [isOpen]);

  const fetchData = useCallback(async () => {
    return getESQLSources(core, getLicense);
  }, [core, getLicense]);

  const getTypeKey = useCallback((source: ESQLSourceResult) => {
    return getSourceTypeKey(source.type);
  }, []);

  const getTypeLabel = useCallback((typeKey: string) => {
    return getSourceTypeLabel(typeKey);
  }, []);

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

  const createOptions = useCallback(
    (sources: ESQLSourceResult[], selectedIndices: string[]): EuiSelectableOption[] => {
      return sources.map((source) => ({
        key: source.name,
        label: source.name,
        checked: selectedIndices.includes(source.name) ? ('on' as const) : undefined,
        append: <EuiTextColor color="subdued">{getSourceTypeLabel(source.type)}</EuiTextColor>,
        data: {
          type: source.type,
          typeKey: getSourceTypeKey(source.type),
          integrationName: source.integrationName,
        },
      }));
    },
    []
  );

  const i18nKeys = useMemo(
    () => ({
      title: i18n.translate('esqlEditor.indicesBrowser.title', {
        defaultMessage: 'Data sources',
      }),
      searchPlaceholder: i18n.translate('esqlEditor.indicesBrowser.searchPlaceholder', {
        defaultMessage: 'Search',
      }),
      filterTitle: i18n.translate('esqlEditor.indicesBrowser.filterTitle', {
        defaultMessage: 'Filter by data source type',
      }),
      integrationFilterTitle: i18n.translate('esqlEditor.indicesBrowser.integrationFilterTitle', {
        defaultMessage: 'Integrations',
      }),
      closeLabel: i18n.translate('esqlEditor.indicesBrowser.closeLabel', {
        defaultMessage: 'Close',
      }),
      loading: i18n.translate('esqlEditor.indicesBrowser.loading', {
        defaultMessage: 'Loading data srources',
      }),
      empty: i18n.translate('esqlEditor.indicesBrowser.empty', {
        defaultMessage: 'No data sources found',
      }),
      noMatches: i18n.translate('esqlEditor.indicesBrowser.noMatches', {
        defaultMessage: 'No data sources match your search',
      }),
    }),
    []
  );

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

        if (typeKey === 'integration' && availableIntegrations.length > 0) {
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
  }, [options, searchValue, selectedTypes, selectedIntegrations, availableIntegrations.length]);

  const handleSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newlySelected = newOptions
        .filter((o) => o.checked === 'on')
        .map((o) => o.key as string)
        .filter(Boolean);

      const oldLength = selectedItems.join(',').length;
      setSelectedItems(newlySelected);
      onSelectIndex(newlySelected.join(','), oldLength);
    },
    [onSelectIndex, selectedItems]
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
    getTypeLabel,
    typeCounts,
    availableIntegrations.length,
    selectedIntegrations,
  ]);

  const filterPanel = isIntegrationPopoverOpen ? (
    <>
      <EuiPopoverTitle paddingSize="s" onClick={() => setIsIntegrationPopoverOpen(false)}>
        <EuiIcon type="arrowLeft" />
        &emsp;
        <EuiLink color="text">{i18nKeys.integrationFilterTitle}</EuiLink>
      </EuiPopoverTitle>
      <EuiSelectable
        options={integrationFilterOptions}
        onChange={handleIntegrationFilterChange}
        listProps={{
          bordered: false,
        }}
      >
        {(integrationList) => (
          <div css={filterListStyles} style={{ width: '250px', maxHeight: 250, overflowY: 'auto' }}>
            {integrationList}
          </div>
        )}
      </EuiSelectable>
    </>
  ) : (
    <>
      <EuiPopoverTitle paddingSize="s">{i18nKeys.filterTitle}</EuiPopoverTitle>
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
          <div css={filterListStyles} style={{ width: '250px', maxHeight: 250, overflowY: 'auto' }}>
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
      position={position}
      fetchData={fetchData}
      i18nKeys={i18nKeys}
      numTypes={availableTypes.length + availableIntegrations.length}
      isLoading={isLoading}
      searchValue={searchValue}
      setSearchValue={setSearchValue}
    />
  );
};
