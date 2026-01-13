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
import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { GetColumnMapFn } from '@kbn/esql-language/src/language/shared/columns_retrieval_helpers';
import type { ESQLColumnData } from '@kbn/esql-language/src/commands/registry/types';
import { FieldIcon } from '@kbn/react-field';

const POPOVER_WIDTH = 400;
const POPOVER_HEIGHT = 500;

// Map ESQL field types to FieldIcon types (matching typeToEuiIconMap keys)
const getFieldIconType = (type: string): string => {
  const typeLower = type.toLowerCase();
  
  // Date types
  if (typeLower === 'date' || typeLower === 'date_nanos' || typeLower === 'date_range') {
    return 'date';
  }
  
  // Counter types (metric counters) - map to number since counter isn't in typeToEuiIconMap
  if (typeLower === 'counter_integer' || typeLower === 'counter_long' || typeLower === 'counter_double') {
    return 'number';
  }
  
  // Histogram types
  if (typeLower === 'histogram' || typeLower === 'exponential_histogram' || typeLower === 'tdigest') {
    return 'histogram';
  }
  
  // Numeric types
  if (
    typeLower === 'number' ||
    typeLower === 'long' ||
    typeLower === 'double' ||
    typeLower === 'integer' ||
    typeLower === 'float' ||
    typeLower === 'byte' ||
    typeLower === 'short' ||
    typeLower === 'half_float' ||
    typeLower === 'scaled_float' ||
    typeLower === 'unsigned_long' ||
    typeLower === 'aggregate_metric_double'
  ) {
    return 'number';
  }
  
  // IP types
  if (typeLower === 'ip' || typeLower === 'ip_range') {
    return 'ip';
  }
  
  // Geo types
  if (typeLower === 'geo_point' || typeLower === 'geo_shape') {
    return 'geo_point';
  }
  
  // Cartesian types - map to shape
  if (typeLower === 'cartesian_point' || typeLower === 'cartesian_shape') {
    return 'shape';
  }
  
  // Keyword types
  if (typeLower === 'keyword' || typeLower === 'constant_keyword') {
    return 'keyword';
  }
  
  // Text types
  if (
    typeLower === 'text' ||
    typeLower === 'string' ||
    typeLower === 'match_only_text' ||
    typeLower === 'wildcard' ||
    typeLower === 'search_as_you_type' ||
    typeLower === 'semantic_text'
  ) {
    return 'text';
  }
  
  // Vector types
  if (typeLower === 'dense_vector') {
    return 'dense_vector';
  }
  
  // Version
  if (typeLower === 'version') {
    return 'version';
  }
  
  // Boolean
  if (typeLower === 'boolean') {
    return 'boolean';
  }
  
  // Default to text for unknown types
  return 'text';
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
  onSelectField: (fieldName: string, oldLength: number) => void;
  getColumnMap?: GetColumnMapFn;
  anchorElement?: HTMLElement;
  position?: { top?: number; left?: number };
}

export const FieldsBrowserPopup: React.FC<FieldsBrowserPopupProps> = ({
  isOpen,
  onClose,
  onSelectField,
  getColumnMap,
  anchorElement,
  position,
}) => {
  const { euiTheme } = useEuiTheme();
  const [fields, setFields] = useState<ESQLFieldWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
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

  useEffect(() => {
    if (isOpen && getColumnMap) {
      setIsLoading(true);
      getColumnMap()
        .then((columnMap: Map<string, ESQLColumnData>) => {
          // Convert ESQLColumnData map to ESQLFieldWithMetadata array
          // Filter out user-defined columns and only keep fields with metadata
          const fetchedFields: ESQLFieldWithMetadata[] = Array.from(columnMap.values())
            .filter((column: ESQLColumnData): column is ESQLFieldWithMetadata => {
              // Only include fields that are not user-defined (i.e., ESQLFieldWithMetadata)
              return column.userDefined === false;
            })
            .map((column: ESQLFieldWithMetadata) => ({
              name: column.name,
              type: column.type,
              hasConflict: column.hasConflict || false,
              userDefined: false as const,
              metadata: column.metadata,
            }));
          setFields(fetchedFields);
          setIsLoading(false);
        })
        .catch(() => {
          setFields([]);
          setIsLoading(false);
        });
    } else if (isOpen && !getColumnMap) {
      setFields([]);
      setIsLoading(false);
    }
  }, [isOpen, getColumnMap]);

  // Focus the search input when popover opens
  useEffect(() => {
    if (isOpen && !isLoading) {
      // Use setTimeout to ensure the DOM is ready
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, isLoading]);

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
      checked: selectedFields.includes(field.name) ? ('on' as const) : undefined,
      prepend: <FieldIcon type={getFieldIconType(field.type)} size="s" className="eui-alignMiddle" />,
      data: {
        type: field.type,
        typeLabel: getFieldTypeLabel(field.type),
      },
    }));
  }, [fields, selectedFields]);

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
      const newlySelected = newOptions
        .filter((o) => o.checked === 'on')
        .map((o) => o.key as string)
        .filter(Boolean);
      
      const oldLength = selectedFields.join(',').length;
      setSelectedFields(newlySelected);
      
      if (newlySelected) {
        onSelectField(newlySelected.join(','), oldLength);
      }

      setSelectedFields(newlySelected);
    },
    [onSelectField, selectedFields]
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
      buttonRef={setFilterButtonRef}
    >
      <EuiIcon type="filter" />
    </EuiFilterButton>
  );

  const button = anchorElement ? undefined : (
    <div style={{ display: 'none' }} />
  );

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
    tabIndex={-1} // Make the popover div focusable
    role="button" // Make it interactive for mouse events
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
          placeholder: i18n.translate('esqlEditor.fieldsBrowser.searchPlaceholder', {
            defaultMessage: 'Search fields...',
          }),
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
      >
        {(list, search) => (
          <div style={{ width: POPOVER_WIDTH, maxHeight: POPOVER_HEIGHT }}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  {i18n.translate('esqlEditor.fieldsBrowser.title', {
                    defaultMessage: 'Fields',
                  })}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    aria-label={i18n.translate('esqlEditor.fieldsBrowser.closeLabel', {
                      defaultMessage: 'Close',
                    })}
                    onClick={onClose}
                    buttonRef={setCloseButtonRef}
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
    </div>
  );
};

