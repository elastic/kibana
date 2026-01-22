/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiNotificationBadge, EuiPopoverTitle, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { ESQLFieldWithMetadata, RecommendedField } from '@kbn/esql-types';
import type { GetColumnMapFn } from '@kbn/esql-language/src/language/shared/columns_retrieval_helpers';
import type { ESQLColumnData } from '@kbn/esql-language/src/commands/registry/types';
import type { HttpStart } from '@kbn/core/public';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';
import { FieldIcon } from '@kbn/react-field';
import { getEditorExtensions } from '@kbn/esql-utils';
import { BrowserPopoverWrapper } from './browser_popover_wrapper';

// Map ESQL field types to FieldIcon types (matching typeToEuiIconMap keys)
const getFieldIconType = (type: string): string => {
  const typeLower = type.toLowerCase();

  // Date types
  if (typeLower === 'date' || typeLower === 'date_nanos' || typeLower === 'date_range') {
    return 'date';
  }

  // Counter types (metric counters) - map to number since counter isn't in typeToEuiIconMap
  if (
    typeLower === 'counter_integer' ||
    typeLower === 'counter_long' ||
    typeLower === 'counter_double'
  ) {
    return 'number';
  }

  // Histogram types
  if (
    typeLower === 'histogram' ||
    typeLower === 'exponential_histogram' ||
    typeLower === 'tdigest'
  ) {
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
  if (
    typeLower.includes('number') ||
    typeLower.includes('long') ||
    typeLower.includes('double') ||
    typeLower.includes('integer')
  )
    return 'Number';
  if (typeLower.includes('ip')) return 'IP address';
  if (typeLower.includes('geo')) return 'Geo point';
  if (typeLower.includes('keyword')) return 'Keyword';
  if (typeLower.includes('text')) return 'Text';
  return type;
};

const getFieldTypeIconType = (typeLabel: string): string => {
  const typeLower = typeLabel.toLowerCase();
  if (typeLower.includes('date') || typeLower.includes('time')) return 'date';
  if (typeLower.includes('number')) return 'number';
  if (typeLower.includes('ip')) return 'ip';
  if (typeLower.includes('geo')) return 'geo_point';
  if (typeLower.includes('keyword')) return 'keyword';
  if (typeLower.includes('text')) return 'text';
  return 'text';
};

interface FieldsBrowserPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectField: (fieldName: string, oldLength: number) => void;
  getColumnMap?: GetColumnMapFn;
  position?: { top?: number; left?: number };
  queryString?: string;
  activeSolutionId?: SolutionId | null;
  http?: HttpStart;
}

export const FieldsBrowserPopover: React.FC<FieldsBrowserPopoverProps> = ({
  isOpen,
  onClose,
  onSelectField,
  getColumnMap,
  position,
  queryString = '',
  activeSolutionId,
  http,
}) => {
  const [items, setItems] = useState<ESQLFieldWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [recommendedFields, setRecommendedFields] = useState<RecommendedField[]>([]);

  // Reset state when popover opens
  useEffect(() => {
    if (isOpen) {
      // Clear all selections and filters when popover opens
      setSelectedTypes([]);
      setSelectedItems([]);
      setSearchValue('');
    }
  }, [isOpen]);

  // Fetch recommended fields when popover opens
  useEffect(() => {
    const fetchRecommendedFields = async () => {
      if (isOpen && http && activeSolutionId && queryString.trim() !== '') {
        try {
          const extensions = await getEditorExtensions(http, queryString, activeSolutionId);
          setRecommendedFields(extensions.recommendedFields || []);
        } catch (error) {
          // If fetching fails, just don't show recommended fields
          setRecommendedFields([]);
        }
      } else {
        setRecommendedFields([]);
      }
    };

    fetchRecommendedFields();
  }, [isOpen, http, activeSolutionId, queryString]);

  const fetchData = useCallback(async (): Promise<ESQLFieldWithMetadata[]> => {
    if (!getColumnMap) {
      return [];
    }
    const columnMap: Map<string, ESQLColumnData> = await getColumnMap();
    // Convert ESQLColumnData map to ESQLFieldWithMetadata array
    // Filter out user-defined columns and only keep fields with metadata
    return Array.from(columnMap.values())
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
  }, [getColumnMap]);

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

  const getTypeKey = useCallback((field: ESQLFieldWithMetadata) => {
    return getFieldTypeLabel(field.type);
  }, []);

  const getTypeLabel = useCallback((typeLabel: string) => {
    return typeLabel;
  }, []);

  const getTypeIcon = useCallback((typeLabel: string) => {
    return (
      <FieldIcon type={getFieldTypeIconType(typeLabel)} size="s" className="eui-alignMiddle" />
    );
  }, []);

  const createOptions = useCallback(
    (fields: ESQLFieldWithMetadata[], selectedFields: string[]): EuiSelectableOption[] => {
      // Create a set of recommended field names for quick lookup
      const recommendedFieldNames = new Set(recommendedFields.map((f) => f.name));

      // Split fields into recommended and available
      const recommended: ESQLFieldWithMetadata[] = [];
      const available: ESQLFieldWithMetadata[] = [];

      fields.forEach((field) => {
        if (recommendedFieldNames.has(field.name)) {
          recommended.push(field);
        } else {
          available.push(field);
        }
      });

      const options: EuiSelectableOption[] = [];

      // Add recommended fields section if there are any
      if (recommended.length > 0) {
        options.push({
          label: i18n.translate('esqlEditor.fieldsBrowser.recommendedFields', {
            defaultMessage: 'Recommended fields',
          }),
          isGroupLabel: true,
          key: 'recommended-fields-group',
        });

        recommended.forEach((field) => {
          options.push({
            key: field.name,
            label: field.name,
            checked: selectedFields.includes(field.name) ? ('on' as const) : undefined,
            prepend: (
              <FieldIcon type={getFieldIconType(field.type)} size="s" className="eui-alignMiddle" />
            ),
            data: {
              type: field.type,
              typeLabel: getFieldTypeLabel(field.type),
              typeKey: getFieldTypeLabel(field.type),
            },
          });
        });
      }

      // Add available fields section
      if (available.length > 0) {
        // Only add section label if we have recommended fields (to create sections)
        if (recommended.length > 0) {
          options.push({
            label: i18n.translate('esqlEditor.fieldsBrowser.availableFields', {
              defaultMessage: 'Available fields',
            }),
            isGroupLabel: true,
            key: 'available-fields-group',
          });
        }

        available.forEach((field) => {
          options.push({
            key: field.name,
            label: field.name,
            checked: selectedFields.includes(field.name) ? ('on' as const) : undefined,
            prepend: (
              <FieldIcon type={getFieldIconType(field.type)} size="s" className="eui-alignMiddle" />
            ),
            data: {
              type: field.type,
              typeLabel: getFieldTypeLabel(field.type),
              typeKey: getFieldTypeLabel(field.type),
            },
          });
        });
      }

      return options;
    },
    [recommendedFields]
  );

  const i18nKeys = useMemo(
    () => ({
      title: i18n.translate('esqlEditor.fieldsBrowser.title', {
        defaultMessage: 'Fields',
      }),
      searchPlaceholder: i18n.translate('esqlEditor.fieldsBrowser.searchPlaceholder', {
        defaultMessage: 'Search',
      }),
      filterTitle: i18n.translate('esqlEditor.fieldsBrowser.filterTitle', {
        defaultMessage: 'Filter by field type',
      }),
      closeLabel: i18n.translate('esqlEditor.fieldsBrowser.closeLabel', {
        defaultMessage: 'Close',
      }),
      loading: i18n.translate('esqlEditor.fieldsBrowser.loading', {
        defaultMessage: 'Loading fields',
      }),
      empty: i18n.translate('esqlEditor.fieldsBrowser.empty', {
        defaultMessage: 'No fields found',
      }),
      noMatches: i18n.translate('esqlEditor.fieldsBrowser.noMatches', {
        defaultMessage: 'No fields match your search',
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
    if (selectedTypes.length > 0) {
      filtered = filtered.filter((option) => {
        // Check if option has typeKey in data (set by createOptions)
        const typeKey = option.data?.typeKey as string | undefined;

        if (!typeKey || !selectedTypes.includes(typeKey)) {
          return false;
        }

        return true;
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
      onSelectField(newlySelected.join(','), oldLength);
    },
    [onSelectField, selectedItems]
  );

  const handleTypeFilterChange = useCallback(
    (newOptions: EuiSelectableOption[], changedOption: EuiSelectableOption | undefined) => {
      const selected = newOptions
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key as string);
      setSelectedTypes(selected);
    },
    []
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
      return {
        key: typeKey,
        label: getTypeLabel(typeKey),
        checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
        prepend: getTypeIcon(typeKey),
        append: (
          <EuiNotificationBadge color="subdued" size="m">
            {typeCounts.get(typeKey) ?? 0}
          </EuiNotificationBadge>
        ),
      };
    });
  }, [availableTypes, selectedTypes, getTypeLabel, typeCounts, getTypeIcon]);

  const filterPanel = (
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
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleSelectionChange}
      position={position}
      fetchData={fetchData}
      i18nKeys={i18nKeys}
      numTypes={availableTypes.length}
      numActiveFilters={selectedTypes.length}
      filterPanel={filterPanel}
      isLoading={isLoading}
      searchValue={searchValue}
      setSearchValue={setSearchValue}
    />
  );
};
