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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ESQLFieldWithMetadata, ESQLCallbacks } from '@kbn/esql-types';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';

const POPOVER_WIDTH = 400;
const POPOVER_HEIGHT = 500;

const getFieldTypeIcon = (type: string): string => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('date') || typeLower.includes('time')) return 'calendar';
  if (typeLower.includes('number') || typeLower.includes('long') || typeLower.includes('double') || typeLower.includes('integer')) return 'number';
  if (typeLower.includes('ip')) return 'globe';
  if (typeLower.includes('geo')) return 'globe';
  if (typeLower.includes('keyword') || typeLower.includes('text')) return 'string';
  return 'document';
};

const getFieldTypeLabel = (type: string): string => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('date') || typeLower.includes('time')) return 'Date';
  if (typeLower.includes('number') || typeLower.includes('long') || typeLower.includes('double') || typeLower.includes('integer')) return 'Number';
  if (typeLower.includes('ip')) return 'IP address';
  if (typeLower.includes('geo')) return 'Geo point';
  if (typeLower.includes('keyword')) return 'Keyword';
  if (typeLower.includes('text')) return 'Text';
  return type;
};

interface FieldsBrowserPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectField: (fieldName: string) => void;
  getColumnsFor?: ESQLCallbacks['getColumnsFor'];
  query: string;
  anchorElement?: HTMLElement;
}

export const FieldsBrowserPopup: React.FC<FieldsBrowserPopupProps> = ({
  isOpen,
  onClose,
  onSelectField,
  getColumnsFor,
  query,
  anchorElement,
}) => {
  const [fields, setFields] = useState<ESQLFieldWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  useEffect(() => {
    if (isOpen && query && getColumnsFor) {
      setIsLoading(true);
      getColumnsFor({ query })
        .then((fetchedFields) => {
          setFields(fetchedFields);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, query, getColumnsFor]);

  // Get unique field types from fields
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    fields.forEach((field) => {
      const typeLabel = getFieldTypeLabel(field.type);
      typeSet.add(typeLabel);
    });
    return Array.from(typeSet).sort();
  }, [fields]);

  // Create filter options for the type filter popover
  const typeFilterOptions: EuiSelectableOption[] = useMemo(() => {
    return availableTypes.map((typeLabel) => ({
      key: typeLabel,
      label: typeLabel,
      checked: selectedTypes.includes(typeLabel) ? ('on' as const) : undefined,
    }));
  }, [availableTypes, selectedTypes]);

  const options: EuiSelectableOption[] = useMemo(() => {
    return fields.map((field) => ({
      key: field.name,
      label: field.name,
      append: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={getFieldTypeIcon(field.type)} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {getFieldTypeLabel(field.type)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      data: {
        type: field.type,
        typeLabel: getFieldTypeLabel(field.type),
      },
    }));
  }, [fields]);

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
        const typeLabel = option.data?.typeLabel;
        return typeLabel && selectedTypes.includes(typeLabel);
      });
    }

    return filtered;
  }, [options, searchValue, selectedTypes]);

  const handleSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((o) => o.checked === 'on');
      if (selected && selected.key) {
        onSelectField(selected.key);
        onClose();
        setSearchValue('');
        setSelectedTypes([]);
      }
    },
    [onSelectField, onClose]
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
      aria-label={i18n.translate('esqlEditor.fieldsBrowser.filterByType', {
        defaultMessage: 'Filter by field type',
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
          placeholder: i18n.translate('esqlEditor.fieldsBrowser.searchPlaceholder', {
            defaultMessage: 'Search fields...',
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
                    'esqlEditor.fieldsBrowser.filterSearchPlaceholder',
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
                      {i18n.translate('esqlEditor.fieldsBrowser.filterTitle', {
                        defaultMessage: 'Filter by field type',
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
        loadingMessage={i18n.translate('esqlEditor.fieldsBrowser.loading', {
          defaultMessage: 'Loading fields...',
        })}
        emptyMessage={i18n.translate('esqlEditor.fieldsBrowser.empty', {
          defaultMessage: 'No fields found',
        })}
        noMatchesMessage={i18n.translate('esqlEditor.fieldsBrowser.noMatches', {
          defaultMessage: 'No fields match your search',
        })}
        singleSelection
        listProps={{
          showIcons: false,
        }}
      >
        {(list, search) => (
          <div style={{ width: POPOVER_WIDTH, maxHeight: POPOVER_HEIGHT }}>
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('esqlEditor.fieldsBrowser.title', {
                defaultMessage: 'Fields',
              })}
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

