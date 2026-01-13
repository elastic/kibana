/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback } from 'react';
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { GetColumnMapFn } from '@kbn/esql-language/src/language/shared/columns_retrieval_helpers';
import type { ESQLColumnData } from '@kbn/esql-language/src/commands/registry/types';
import { FieldIcon } from '@kbn/react-field';
import { BrowserPopoverWrapper } from './browser_popover_wrapper';

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

interface FieldsBrowserPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectField: (fieldName: string, oldLength: number) => void;
  getColumnMap?: GetColumnMapFn;
  anchorElement?: HTMLElement;
  position?: { top?: number; left?: number };
}

export const FieldsBrowserPopover: React.FC<FieldsBrowserPopoverProps> = ({
  isOpen,
  onClose,
  onSelectField,
  getColumnMap,
  anchorElement,
  position,
}) => {
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

  const getTypeKey = useCallback((field: ESQLFieldWithMetadata) => {
    return getFieldTypeLabel(field.type);
  }, []);

  const getTypeLabel = useCallback((typeLabel: string) => {
    return typeLabel;
  }, []);

  const createOptions = useCallback(
    (fields: ESQLFieldWithMetadata[], selectedFields: string[]): EuiSelectableOption[] => {
      return fields.map((field) => ({
        key: field.name,
        label: field.name,
        checked: selectedFields.includes(field.name) ? ('on' as const) : undefined,
        prepend: <FieldIcon type={getFieldIconType(field.type)} size="s" className="eui-alignMiddle" />,
        data: {
          type: field.type,
          typeLabel: getFieldTypeLabel(field.type),
          typeKey: getFieldTypeLabel(field.type), // Add typeKey for filtering
        },
      }));
    },
    []
  );

  const i18nKeys = useMemo(
    () => ({
      title: i18n.translate('esqlEditor.fieldsBrowser.title', {
        defaultMessage: 'Fields',
      }),
      searchPlaceholder: i18n.translate('esqlEditor.fieldsBrowser.searchPlaceholder', {
        defaultMessage: 'Search fields...',
      }),
      filterTitle: i18n.translate('esqlEditor.fieldsBrowser.filterTitle', {
        defaultMessage: 'Filter by field type',
      }),
      filterSearchPlaceholder: i18n.translate(
        'esqlEditor.fieldsBrowser.filterSearchPlaceholder',
        {
          defaultMessage: 'Search types',
        }
      ),
      filterByType: i18n.translate('esqlEditor.fieldsBrowser.filterByType', {
        defaultMessage: 'Filter by field type',
      }),
      closeLabel: i18n.translate('esqlEditor.fieldsBrowser.closeLabel', {
        defaultMessage: 'Close',
      }),
      loading: i18n.translate('esqlEditor.fieldsBrowser.loading', {
        defaultMessage: 'Loading fields...',
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

  return (
    <BrowserPopoverWrapper
      isOpen={isOpen}
      onClose={onClose}
      onSelect={onSelectField}
      anchorElement={anchorElement}
      position={position}
      fetchData={fetchData}
      getTypeKey={getTypeKey}
      getTypeLabel={getTypeLabel}
      createOptions={createOptions}
      i18nKeys={i18nKeys}
    />
  );
};

