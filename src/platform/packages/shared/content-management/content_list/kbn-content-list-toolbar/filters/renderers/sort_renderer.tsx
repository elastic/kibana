/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { EuiSelectable, EuiIcon, useEuiTheme, type Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useContentListConfig,
  useContentListSort,
  type SortField,
} from '@kbn/content-list-provider';
import { useFilterPopover, FilterPopover } from '../filter_popover';

/**
 * Props for the {@link SortRenderer} component.
 */
export interface SortRendererProps {
  /** Query object from `EuiSearchBar` (unused - sort doesn't affect query). */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar` (unused - sort doesn't affect query). */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Internal interface for sort option items.
 */
interface SortItem {
  /** Display label for the sort option. */
  label: string;
  /** Field to sort by. */
  field: string;
  /** Sort direction. */
  direction: 'asc' | 'desc';
  /** Optional React node to append (e.g., sort direction icon). */
  append?: React.ReactNode;
  /** Whether this option is checked. */
  checked?: 'on' | undefined;
}

const i18nText = {
  headerSort: i18n.translate('contentManagement.contentList.sortRenderer.headerLabel', {
    defaultMessage: 'Sort by',
  }),
  recentlyViewed: i18n.translate('contentManagement.contentList.sortRenderer.recentlyViewedLabel', {
    defaultMessage: 'Recently viewed',
  }),
};

const RECENTLY_ACCESSED_SORT_FIELD = '_recentlyAccessed';

/**
 * Generates sort options from an array of {@link SortField} configurations.
 *
 * @param fields - Array of sort field configurations.
 * @returns Array of {@link SortItem} options for the sort selector.
 */
const generateOptionsFromFields = (fields: SortField[]): SortItem[] => {
  const options: SortItem[] = [];

  for (const { field, name, ascLabel, descLabel } of fields) {
    options.push({
      label: ascLabel ?? getAscLabel(field, name),
      field,
      direction: 'asc',
      append: <EuiIcon type="sortUp" />,
    });

    options.push({
      label: descLabel ?? getDescLabel(field, name),
      field,
      direction: 'desc',
      append: <EuiIcon type="sortDown" />,
    });
  }

  return options;
};

/**
 * Gets the ascending sort label for a field.
 *
 * @param field - The field name.
 * @param name - The display name.
 * @returns A formatted label string for ascending sort.
 */
const getAscLabel = (field: string, name: string): string => {
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('at')) {
    return i18n.translate('contentManagement.contentList.sortRenderer.dateAscLabel', {
      defaultMessage: '{name} (oldest first)',
      values: { name },
    });
  }
  return i18n.translate('contentManagement.contentList.sortRenderer.stringAscLabel', {
    defaultMessage: '{name} A-Z',
    values: { name },
  });
};

/**
 * Gets the descending sort label for a field.
 *
 * @param field - The field name.
 * @param name - The display name.
 * @returns A formatted label string for descending sort.
 */
const getDescLabel = (field: string, name: string): string => {
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('at')) {
    return i18n.translate('contentManagement.contentList.sortRenderer.dateDescLabel', {
      defaultMessage: '{name} (newest first)',
      values: { name },
    });
  }
  return i18n.translate('contentManagement.contentList.sortRenderer.stringDescLabel', {
    defaultMessage: '{name} Z-A',
    values: { name },
  });
};

/**
 * `SortRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * This is the actual UI component for the sort dropdown.
 * It doesn't use `query`/`onChange` props since sort doesn't affect the query text.
 *
 * @param props - The component props. See {@link SortRendererProps}.
 * @returns A React element containing the sort dropdown.
 */
export const SortRenderer = ({
  'data-test-subj': dataTestSubj = 'contentListSortRenderer',
}: SortRendererProps) => {
  const { euiTheme } = useEuiTheme();
  const config = useContentListConfig();
  const { field, direction, setSort } = useContentListSort();
  const { isOpen, toggle, close } = useFilterPopover();

  const sortingConfig = typeof config.sorting === 'object' ? config.sorting : undefined;

  const hasRecentlyAccessed = useMemo(() => {
    if (!config.recentlyAccessed?.service?.get) {
      return false;
    }
    try {
      const items = config.recentlyAccessed.service.get();
      return items && items.length > 0;
    } catch {
      return false;
    }
  }, [config.recentlyAccessed]);

  const initialOptions = useMemo((): SortItem[] => {
    let options: SortItem[] = [];

    if (sortingConfig?.fields && sortingConfig.fields.length > 0) {
      options = generateOptionsFromFields(sortingConfig.fields);
    } else if (sortingConfig?.options && sortingConfig.options.length > 0) {
      options = sortingConfig.options.map((option) => ({
        label: option.label,
        field: option.field,
        direction: option.direction,
        append: <EuiIcon type={option.direction === 'asc' ? 'sortUp' : 'sortDown'} />,
      }));
    } else {
      options = [
        {
          label: i18n.translate('contentManagement.contentList.sortRenderer.nameAscLabel', {
            defaultMessage: 'Name A-Z',
          }),
          field: 'title',
          direction: 'asc',
          append: <EuiIcon type="sortUp" />,
        },
        {
          label: i18n.translate('contentManagement.contentList.sortRenderer.nameDescLabel', {
            defaultMessage: 'Name Z-A',
          }),
          field: 'title',
          direction: 'desc',
          append: <EuiIcon type="sortDown" />,
        },
        {
          label: i18n.translate('contentManagement.contentList.sortRenderer.updatedAtDescLabel', {
            defaultMessage: 'Recently updated',
          }),
          field: 'updatedAt',
          direction: 'desc',
          append: <EuiIcon type="sortDown" />,
        },
        {
          label: i18n.translate('contentManagement.contentList.sortRenderer.updatedAtAscLabel', {
            defaultMessage: 'Least recently updated',
          }),
          field: 'updatedAt',
          direction: 'asc',
          append: <EuiIcon type="sortUp" />,
        },
      ];
    }

    if (hasRecentlyAccessed) {
      options = [
        {
          label: i18nText.recentlyViewed,
          field: RECENTLY_ACCESSED_SORT_FIELD,
          direction: 'desc',
          append: <EuiIcon type="clock" />,
        },
        ...options,
      ];
    }

    return options;
  }, [sortingConfig, hasRecentlyAccessed]);

  const [options, setOptions] = useState<SortItem[]>(() =>
    initialOptions.map((option) => ({
      ...option,
      checked: option.field === field && option.direction === direction ? 'on' : undefined,
    }))
  );

  useEffect(() => {
    setOptions(
      initialOptions.map((option) => ({
        ...option,
        checked: option.field === field && option.direction === direction ? 'on' : undefined,
      }))
    );
  }, [initialOptions, field, direction]);

  const selectedOptionLabel = useMemo(() => {
    return options.find((opt) => opt.checked === 'on')?.label ?? '';
  }, [options]);

  const handleSelectChange = useCallback(
    (updatedOptions: SortItem[]) => {
      setOptions(updatedOptions);

      const selectedOption = updatedOptions.find((opt) => opt.checked === 'on');
      if (selectedOption) {
        setSort(selectedOption.field, selectedOption.direction);
        close();
      }
    },
    [setSort, close]
  );

  return (
    <FilterPopover
      title={i18nText.headerSort}
      buttonLabel={selectedOptionLabel}
      isOpen={isOpen}
      onToggle={toggle}
      onClose={close}
      panelWidth={euiTheme.base * 18}
      data-test-subj={dataTestSubj}
    >
      <EuiSelectable<SortItem>
        singleSelection="always"
        aria-label={i18n.translate('contentManagement.contentList.sortRenderer.ariaLabel', {
          defaultMessage: 'Sorting options',
        })}
        options={options}
        onChange={handleSelectChange}
        data-test-subj="sortSelectOptions"
      >
        {(list) => list}
      </EuiSelectable>
    </FilterPopover>
  );
};
