/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiFilterSelectItem, EuiPopover } from '@elastic/eui';
import {
  TYPE_COMPRESSED,
  TYPE_IMAGE,
  TYPE_PDF,
  TYPE_TEXT,
  compressionMimeTypes,
  imageMimeTypes,
  pdfMimeTypes,
  textMimeTypes,
} from './use_type_filter_panel';

import type { TypeFilterPanelProps, ItemProps, SelectedTypeProps } from './use_type_filter_panel';

export const TypeFilterPanel: FC<TypeFilterPanelProps> = ({ onSearch }) => {
  const [isPopoverOpen, setPopoverStatus] = useState<boolean>(false);
  const initialTypes = [
    { label: TYPE_COMPRESSED, checked: false, values: compressionMimeTypes },
    { label: TYPE_IMAGE, checked: false, values: imageMimeTypes },
    { label: TYPE_PDF, checked: false, values: pdfMimeTypes },
    { label: TYPE_TEXT, checked: false, values: textMimeTypes },
  ];

  const [types, setTypes] = useState<ItemProps[]>(initialTypes);

  const changeItemStatus = (item: ItemProps) => {
    const updatedFilters: ItemProps[] = types.map((filter) => {
      if (filter.label === item.label) {
        return { ...filter, checked: !item.checked };
      }
      return filter;
    });

    setTypes(updatedFilters);
  };

  const [selectedTypes, setSelectedTypes] = useState<SelectedTypeProps[]>([]);

  const handleSearchParam = useMemo(() => {
    if (selectedTypes.length > 0) {
      return selectedTypes.flatMap((type) => type.values);
    }
    return [];
  }, [selectedTypes]);

  const handleSelectedTypes = useCallback(
    (selectedType: SelectedTypeProps) => {
      setSelectedTypes((prevState) => {
        const isTypeSelected = prevState.some((type) => isEqual(type, selectedType));

        if (isTypeSelected) {
          return prevState.filter((state) => !isEqual(state, selectedType));
        } else {
          return [...prevState, selectedType];
        }
      });
    },
    [setSelectedTypes]
  );

  useEffect(() => {
    onSearch(handleSearchParam);
  }, [onSearch, handleSearchParam]);

  const activeFiltersCount = types.filter((itemFilter) => itemFilter.checked).length;

  return (
    <EuiFilterGroup>
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            iconType="arrowDown"
            onClick={() => setPopoverStatus((prevState) => !prevState)}
            hasActiveFilters={activeFiltersCount > 0}
            numActiveFilters={activeFiltersCount}
            numFilters={types.length}
          >
            Type
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverStatus(false)}
        panelPaddingSize="none"
      >
        <div className="euiFilterSelect__items">
          {types.map((filter, index) => {
            const selected = { label: filter.label, values: filter.values };

            const handleClick = () => {
              changeItemStatus(filter);
              handleSelectedTypes(selected);
            };

            return (
              <EuiFilterSelectItem
                key={index}
                checked={filter.checked ? 'on' : undefined}
                onClick={handleClick}
              >
                {filter.label}
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
