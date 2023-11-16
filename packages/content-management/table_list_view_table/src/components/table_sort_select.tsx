/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from '@elastic/eui';
import { css } from '@emotion/react';

import { State } from '../table_list_view_table';

type SortItem = EuiSelectableOption & {
  column: SortColumnField;
  direction: Direction;
};

export type SortColumnField = 'updatedAt' | 'attributes.title';

const i18nText = {
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
  tableSort: State['tableSort'];
  onChange?: (column: SortColumnField, direction: Direction) => void;
}

export function TableSortSelect({ tableSort, hasUpdatedAtMetadata, onChange }: Props) {
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
          singleSelection
          aria-label="some aria label"
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
