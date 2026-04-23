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
import type { ESQLFieldWithMetadata, ESQLRegistrySolutionId } from '@kbn/esql-types';
import { FieldIcon } from '@kbn/react-field';
import { getFieldIconType } from '@kbn/field-utils/src/components/field_select/utils';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BrowserPopoverWrapper } from '../browser_popover_wrapper';
import { DataSourceSelectionChange } from '../types';
import { FIELDS_BROWSER_I18N_KEYS } from './i18n';
import { getFieldTypeLabel, getFieldTypeIconType } from './utils';
import { useAllFields } from './use_all_fields';

interface FieldsBrowserKibanaServices {
  core: { http: HttpStart };
  data: Pick<DataPublicPluginStart, 'search' | 'query'>;
}

interface FieldsBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fieldName: string, change: DataSourceSelectionChange) => void;
  /**
   * Fields passed from autocomplete to render immediately without fetching.
   * If empty/undefined, the browser will fetch fields using `getEsqlColumns` when possible.
   */
  preloadedFields: Array<{ name: string; type?: string }>;
  /** Index pattern derived from the main sources list (e.g. "index1,index2" or "*"). */
  indexPattern: string;
  /** Full ES|QL query text used for fetching recommended fields. */
  fullQuery: string;
  activeSolutionId?: ESQLRegistrySolutionId;
  position?: { top?: number; left?: number };
}

export const FieldsBrowser: React.FC<FieldsBrowserProps> = ({
  isOpen,
  onClose,
  onSelect,
  preloadedFields,
  indexPattern,
  fullQuery,
  activeSolutionId,
  position,
}) => {
  const { services } = useKibana<FieldsBrowserKibanaServices>();
  const getTimeRange = useCallback(
    () => services.data.query.timefilter.timefilter.getTime(),
    [services.data.query.timefilter.timefilter]
  );
  const abortController = useMemo(() => (isOpen ? new AbortController() : undefined), [isOpen]);
  useEffect(() => {
    return () => abortController?.abort();
  }, [abortController]);

  const { allFields, recommendedFields, isLoading } = useAllFields({
    isOpen,
    preloadedFields,
    indexPattern,
    fullQuery,
    http: services.core.http,
    activeSolutionId,
    search: services.data.search.search,
    getTimeRange,
    signal: abortController?.signal,
  });
  const [searchValue, setSearchValue] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Reset state when popover opens
  useEffect(() => {
    if (isOpen) {
      // Clear all selections and filters when popover opens
      setSelectedTypes([]);
      setSelectedItems([]);
      setSearchValue('');
    }
  }, [isOpen]);

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

  // Get unique types from items
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    allFields.forEach((item) => {
      const typeKey = getFieldTypeLabel(item.type);
      typeSet.add(typeKey);
    });
    return Array.from(typeSet).sort();
  }, [allFields]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allFields.forEach((item) => {
      const typeKey = getFieldTypeLabel(item.type);
      counts.set(typeKey, (counts.get(typeKey) ?? 0) + 1);
    });
    return counts;
  }, [allFields]);

  const options: EuiSelectableOption[] = useMemo(() => {
    return createOptions(allFields, selectedItems);
  }, [allFields, selectedItems, createOptions]);

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
    (changedOption: EuiSelectableOption | undefined) => {
      const fieldName = changedOption?.key;
      if (!fieldName || typeof fieldName !== 'string') return;

      const isSelected = changedOption.checked === 'on';
      setSelectedItems(isSelected ? [fieldName] : []);
      onSelect(
        fieldName,
        isSelected ? DataSourceSelectionChange.Add : DataSourceSelectionChange.Remove
      );
    },
    [onSelect]
  );

  const handleTypeFilterChange = (
    newOptions: EuiSelectableOption[],
    changedOption: EuiSelectableOption | undefined
  ) => {
    const selected = newOptions
      .filter((opt) => opt.checked === 'on')
      .map((opt) => opt.key as string);
    setSelectedTypes(selected);
  };

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
        label: getFieldTypeLabel(typeKey),
        checked: selectedTypes.includes(typeKey) ? ('on' as const) : undefined,
        prepend: (
          <FieldIcon type={getFieldTypeIconType(typeKey)} size="s" className="eui-alignMiddle" />
        ),
        append: (
          <EuiNotificationBadge color="subdued" size="m">
            {typeCounts.get(typeKey) ?? 0}
          </EuiNotificationBadge>
        ),
      };
    });
  }, [availableTypes, selectedTypes, typeCounts]);

  const filterPanel = (
    <>
      <EuiPopoverTitle paddingSize="s">{FIELDS_BROWSER_I18N_KEYS.filterTitle}</EuiPopoverTitle>
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
      isFilterOpen={isFilterPopoverOpen}
      setIsFilterOpen={setIsFilterPopoverOpen}
      position={position}
      i18nKeys={FIELDS_BROWSER_I18N_KEYS}
      numTypes={availableTypes.length}
      numActiveFilters={selectedTypes.length}
      filterPanel={filterPanel}
      isLoading={isLoading}
      searchValue={searchValue}
      setSearchValue={setSearchValue}
      isMultiSelect={false}
    />
  );
};
