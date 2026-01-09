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
  EuiText,
  EuiFilterButton,
  EuiIcon,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { getESQLSources } from '@kbn/esql-utils';
import type { CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';

const POPOVER_WIDTH = 400;
const POPOVER_HEIGHT = 500;

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

interface IndicesBrowserPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (indexName: string, oldLength: number) => void;
  core: CoreStart;
  getLicense?: () => Promise<ILicense | undefined>;
  anchorElement?: HTMLElement;
}

export const IndicesBrowserPopup: React.FC<IndicesBrowserPopupProps> = ({
  isOpen,
  onClose,
  onSelectIndex,
  core,
  getLicense,
  anchorElement,
}) => {
  const [sources, setSources] = useState<ESQLSourceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getESQLSources(core, getLicense)
        .then((fetchedSources) => {
          setSources(fetchedSources);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, core, getLicense]);

  // Get unique source types from sources
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    sources.forEach((source) => {
      const typeKey = getSourceTypeKey(source.type);
      typeSet.add(typeKey);
    });
    return Array.from(typeSet).sort();
  }, [sources]);

  // Create filter options for the type filter popover
  const typeFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableTypes.map((typeKey) => ({
      key: typeKey,
      label: getSourceTypeLabel(typeKey),
      checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
    }));
  }, [availableTypes, selectedTypes]);

  const options: EuiSelectableOption[] = useMemo(() => {
    return sources.map((source) => ({
      key: source.name,
      label: source.name,
      checked: selectedIndices.includes(source.name) ? ('on' as const) : undefined,
      append: (
        <EuiText size="xs" color="subdued">
          {getSourceTypeLabel(source.type)}
        </EuiText>
      ),
      data: {
        type: source.type,
        typeKey: getSourceTypeKey(source.type),
      },
    }));
  }, [sources, selectedIndices]);

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
        const typeKey = option.data?.typeKey;
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

      const oldLength = selectedIndices.join(',').length;
      
      if (newlySelected) {
        onSelectIndex(newlySelected.join(','), oldLength);
      }

      setSelectedIndices(newlySelected);
    },
    [onSelectIndex, selectedIndices]
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
      aria-label={i18n.translate('esqlEditor.indicesBrowser.filterByType', {
        defaultMessage: 'Filter by data source',
      })}
    >
      <EuiIcon type="filter" />
    </EuiFilterButton>
  );

  const button = anchorElement ? undefined : (
    <div style={{ display: 'none' }} />
  );

  return (
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
          placeholder: i18n.translate('esqlEditor.indicesBrowser.searchPlaceholder', {
            defaultMessage: 'Search indices, aliases, data streams...',
          }),
          compressed: true,
          value: searchValue,
          onChange: (value) => setSearchValue(value),
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
                  placeholder: i18n.translate(
                    'esqlEditor.indicesBrowser.filterSearchPlaceholder',
                    {
                      defaultMessage: 'Search types',
                    }
                  ),
                  compressed: true,
                }}
                options={typeFilterOptions}
                onChange={handleTypeFilterChange}
              >
                {(list, search) => (
                  <div style={{ width: 250, maxHeight: 300 }}>
                    <EuiPopoverTitle paddingSize="s">
                      {i18n.translate('esqlEditor.indicesBrowser.filterTitle', {
                        defaultMessage: 'Filter by data source',
                      })}
                    </EuiPopoverTitle>
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
        loadingMessage={i18n.translate('esqlEditor.indicesBrowser.loading', {
          defaultMessage: 'Loading data srources...',
        })}
        emptyMessage={i18n.translate('esqlEditor.indicesBrowser.empty', {
          defaultMessage: 'No data sources found',
        })}
        noMatchesMessage={i18n.translate('esqlEditor.indicesBrowser.noMatches', {
          defaultMessage: 'No data sources match your search',
        })}
      >
        {(list, search) => (
          <div style={{ width: POPOVER_WIDTH, maxHeight: POPOVER_HEIGHT }}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  {i18n.translate('esqlEditor.indicesBrowser.title', {
                    defaultMessage: 'Data sources',
                  })}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    aria-label={i18n.translate('esqlEditor.indicesBrowser.closeLabel', {
                      defaultMessage: 'Close',
                    })}
                    onClick={onClose}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            {search}
            <div style={{ maxHeight: POPOVER_HEIGHT - 100, overflowY: 'auto' }}>
              {list}
            </div>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

