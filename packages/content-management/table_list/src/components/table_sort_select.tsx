/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import {
  EuiSelectable,
  EuiPopover,
  EuiFilterButton,
  EuiSelectableOption,
  EuiIcon,
  Direction,
} from '@elastic/eui';

import type { UserContentCommonSchema } from '../table_list_view';

type SortItem<T extends UserContentCommonSchema> = EuiSelectableOption & {
  column: keyof T;
  direction: Direction;
};

export type SortColumn = 'updatedAt' | 'attributes.title';

interface Props<T> {
  onChange?: (column: keyof T, direction: Direction) => void;
}

export function TableSortSelect<T extends UserContentCommonSchema>({ onChange }: Props<T>) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<Array<SortItem<T>>>([
    {
      label: 'Title A-Z',
      column: 'attributes.title' as keyof T,
      direction: 'asc',
      append: <EuiIcon type="sortUp" />,
    },
    {
      label: 'Title Z-A',
      column: 'attributes.title' as keyof T,
      direction: 'desc',
      append: <EuiIcon type="sortDown" />,
    },
    {
      label: 'Recently updated',
      column: 'updatedAt',
      direction: 'asc',
      append: <EuiIcon type="sortUp" />,
    },
    {
      label: 'Least recently updated',
      column: 'updatedAt',
      direction: 'desc',
      append: <EuiIcon type="sortDown" />,
    },
  ]);

  const togglePopOver = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton iconType="arrowDown" iconSide="right" onClick={togglePopOver} grow>
      Recently updated
    </EuiFilterButton>
  );

  const onSelectChange = (updatedOptions: Array<SortItem<T>>) => {
    setOptions(updatedOptions);

    if (onChange) {
      const selectedOption = updatedOptions.find(({ checked }) => checked === 'on');
      onChange(selectedOption!.column, selectedOption!.direction);
    }
  };

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      panelClassName="euiFilterGroup__popoverPanel"
    >
      <EuiSelectable<SortItem<T>>
        singleSelection
        aria-label="some aria label"
        options={options}
        onChange={onSelectChange}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
}
