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

type SortItem = EuiSelectableOption & {
  column: SortColumnField;
  direction: Direction;
};

export type SortColumnField = 'updatedAt' | 'attributes.title';

interface Props {
  hasUpdatedAtMetadata: boolean;
  onChange?: (column: SortColumnField, direction: Direction) => void;
}

export function TableSortSelect({ hasUpdatedAtMetadata, onChange }: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<SortItem[]>(() => {
    let opts: SortItem[] = [
      {
        label: 'Title A-Z',
        column: 'attributes.title',
        direction: 'asc',
        append: <EuiIcon type="sortUp" />,
      },
      {
        label: 'Title Z-A',
        column: 'attributes.title',
        direction: 'desc',
        append: <EuiIcon type="sortDown" />,
      },
    ];

    if (hasUpdatedAtMetadata) {
      opts = opts.concat([
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
    }

    return opts;
  });

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

  const onSelectChange = (updatedOptions: SortItem[]) => {
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
      <EuiSelectable<SortItem>
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
