/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSelectable,
  EuiPopover,
  EuiFilterButton,
  EuiSelectableOption,
  EuiIcon,
  Direction,
  EuiText,
  useEuiTheme,
  EuiIconTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

import { State } from '../table_list_view_table';

type SortItem = EuiSelectableOption & {
  column: SortColumnField;
  direction: Direction;
};

export type SortColumnField = 'updatedAt' | 'attributes.title' | 'accessedAt';

const i18nText = {
  accessedDescSort: i18n.translate(
    'contentManagement.tableList.listing.tableSortSelect.recentlyAccessedLabel',
    {
      defaultMessage: 'Recently viewed',
    }
  ),
  nameAscSort: i18n.translate('contentManagement.tableList.listing.tableSortSelect.nameAscLabel', {
    defaultMessage: 'Name A-Z',
  }),
  nameDescSort: i18n.translate(
    'contentManagement.tableList.listing.tableSortSelect.nameDescLabel',
    {
      defaultMessage: 'Name Z-A',
    }
  ),
  updatedAtAscSort: i18n.translate(
    'contentManagement.tableList.listing.tableSortSelect.updatedAtAscLabel',
    {
      defaultMessage: 'Least recently updated',
    }
  ),
  updatedAtDescSort: i18n.translate(
    'contentManagement.tableList.listing.tableSortSelect.updatedAtDescLabel',
    {
      defaultMessage: 'Recently updated',
    }
  ),
  headerSort: i18n.translate('contentManagement.tableList.listing.tableSortSelect.headerLabel', {
    defaultMessage: 'Sort by',
  }),
};

interface Props {
  hasUpdatedAtMetadata: boolean;
  hasRecentlyAccessedMetadata: boolean;
  tableSort: State['tableSort'];
  onChange?: (column: SortColumnField, direction: Direction) => void;
}

export function TableSortSelect({
  tableSort,
  hasUpdatedAtMetadata,
  hasRecentlyAccessedMetadata,
  onChange,
}: Props) {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<SortItem[]>(() => {
    let opts: SortItem[] = [
      {
        label: i18nText.nameAscSort,
        column: 'attributes.title',
        direction: 'asc',
        append: <EuiIcon type="sortUp" />,
      },
      {
        label: i18nText.nameDescSort,
        column: 'attributes.title',
        direction: 'desc',
        append: <EuiIcon type="sortDown" />,
      },
    ];

    if (hasRecentlyAccessedMetadata) {
      opts = [
        {
          label: i18nText.accessedDescSort,
          column:
            'accessedAt' /* nonexistent field, used to identify this custom type of sorting */,
          direction: 'desc',
          append: (
            <EuiIconTip
              aria-label={i18n.translate(
                'contentManagement.tableList.listing.tableSortSelect.recentlyAccessedTipAriaLabel',
                {
                  defaultMessage: 'Additional information',
                }
              )}
              position="right"
              color="inherit"
              iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
              css={{ textWrap: 'balance' }}
              type={'questionInCircle'}
              content={i18n.translate(
                'contentManagement.tableList.listing.tableSortSelect.recentlyAccessedTip',
                {
                  defaultMessage:
                    'Recently viewed info is stored locally in your browser and is only visible to you.',
                }
              )}
            />
          ),
        },
        ...opts,
      ];
    }

    if (hasUpdatedAtMetadata) {
      opts = opts.concat([
        {
          label: i18nText.updatedAtDescSort,
          column: 'updatedAt',
          direction: 'desc',
          append: <EuiIcon type="sortDown" />,
        },
        {
          label: i18nText.updatedAtAscSort,
          column: 'updatedAt',
          direction: 'asc',
          append: <EuiIcon type="sortUp" />,
        },
      ]);
    }

    return opts;
  });

  const selectedOptionLabel = options.find(({ checked }) => checked === 'on')?.label ?? '';

  const panelHeaderCSS = css`
    border-bottom: ${euiTheme.border.thin};
    font-weight: ${600};
    padding: ${euiTheme.size.s};
  `;

  const togglePopOver = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      iconSide="right"
      onClick={togglePopOver}
      data-test-subj="tableSortSelectBtn"
      grow
    >
      {selectedOptionLabel}
    </EuiFilterButton>
  );

  const onSelectChange = (updatedOptions: SortItem[]) => {
    setOptions(updatedOptions);

    const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
    if (selectedOption && onChange) {
      onChange(selectedOption.column, selectedOption.direction);
    }
  };

  useEffect(() => {
    setOptions((prev) => {
      return prev.map((option) => {
        const checked =
          option.column === tableSort.field && option.direction === tableSort.direction
            ? 'on'
            : undefined;

        return {
          ...option,
          checked,
        };
      });
    });
  }, [tableSort]);

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      panelProps={{ css: { width: euiTheme.base * 18 } }}
    >
      <>
        <EuiText css={panelHeaderCSS}>{i18nText.headerSort}</EuiText>
        <EuiSelectable<SortItem>
          singleSelection={'always'}
          aria-label={i18n.translate(
            'contentManagement.tableList.listing.tableSortSelect.sortingOptionsAriaLabel',
            { defaultMessage: 'Sorting options' }
          )}
          options={options}
          onChange={onSelectChange}
          data-test-subj="sortSelect"
        >
          {(list) => list}
        </EuiSelectable>
      </>
    </EuiPopover>
  );
}

const sortStorageKey = (tableId: string) => `tableSort:${tableId}`;
export function getInitialSorting(tableId: string): {
  isDefault: boolean;
  tableSort: {
    field: SortColumnField;
    direction: Direction;
  };
} {
  try {
    const storedSorting = localStorage.getItem(sortStorageKey(tableId));
    if (storedSorting) {
      const tableSort = JSON.parse(storedSorting);
      return { isDefault: false, tableSort };
    }
  } catch (e) {
    // ignore
  }

  return {
    isDefault: true,
    tableSort: {
      field: 'attributes.title' as const,
      direction: 'asc',
    },
  };
}
export function saveSorting(
  tableId: string,
  tableSort: { field: SortColumnField; direction: Direction }
) {
  try {
    localStorage.setItem(sortStorageKey(tableId), JSON.stringify(tableSort));
  } catch (e) {
    /* empty */
  }
}

/**
 * Default custom sorting for the table when recently accessed info is available
 * Sorts by recently accessed list first and the by lastUpdatedAt
 */
export function sortByRecentlyAccessed<T extends UserContentCommonSchema>(
  items: T[],
  recentlyAccessed: Array<{ id: string }>
) {
  const recentlyAccessedMap = new Map(recentlyAccessed.map((item, index) => [item.id, index]));
  return [...items].sort((a, b) => {
    if (recentlyAccessedMap.has(a.id) && recentlyAccessedMap.has(b.id)) {
      return recentlyAccessedMap.get(a.id)! - recentlyAccessedMap.get(b.id)!;
    } else if (recentlyAccessedMap.has(a.id)) {
      return -1;
    } else if (recentlyAccessedMap.has(b.id)) {
      return 1;
    } else {
      return a.updatedAt > b.updatedAt ? -1 : 1;
    }
  });
}
