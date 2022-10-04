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
} from '@elastic/eui';

type SortItem = EuiSelectableOption & { view: JSX.Element };

export const TableSortSelect = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<SortItem[]>([
    {
      label: 'Title A-Z',
      view: <div>Title A-Z</div>,
      append: <EuiIcon type="sortUp" />,
    },
    {
      label: 'Title Z-A',
      view: <div>Title Z-A</div>,
      append: <EuiIcon type="sortDown" />,
    },
    {
      label: 'Recently updated',
      view: <div>Recently updated</div>,
      append: <EuiIcon type="sortUp" />,
    },
    {
      label: 'Least recently updated',
      view: <div>Least recently updated</div>,
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
        renderOption={(option) => option.view}
        onChange={(updatedOptions) => {
          setOptions(updatedOptions);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
