/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiDataGridToolbarControl,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataGridSortColumn, DataGridSortDirection, DataGridSorting } from '../types';
import { getSortLabels } from '../utils/sort_labels';

export interface SortSelectorColumn {
  id: string;
  displayAsText: string;
  schema?: string;
}

interface SortSelectorProps {
  /** The columns that can be sorted. */
  columns: SortSelectorColumn[];
  sorting: DataGridSorting;
}

export const SortSelector = ({ columns, sorting }: SortSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { columns: sortColumns, onSort } = sorting;
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const sortedColumns = sortColumns.filter(({ id }) => columnsById.has(id));
  const unsortedColumns = columns.filter(({ id }) => !sortColumns.some((col) => col.id === id));

  const changeDirection = (id: string, direction: DataGridSortDirection) =>
    onSort(sortColumns.map((column) => (column.id === id ? { id, direction } : column)));

  const onDragEnd = ({
    source,
    destination,
  }: {
    source: { index: number };
    destination?: { index: number } | null;
  }) => {
    if (source && destination) {
      onSort(euiDragDropReorder(sortedColumns, source.index, destination.index));
    }
  };

  const button = (
    <EuiDataGridToolbarControl
      iconType="sortable"
      badgeContent={sortedColumns.length}
      data-test-subj="dataGridColumnSortingButton"
      onClick={() => setIsOpen((open) => !open)}
    >
      {i18n.translate('kbnDataGrid.toolbar.sortFields', { defaultMessage: 'Sort fields' })}
    </EuiDataGridToolbarControl>
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="s"
      aria-label={i18n.translate('kbnDataGrid.toolbar.sortPopover', {
        defaultMessage: 'Sort fields',
      })}
      button={button}
    >
      <div css={{ minWidth: 340 }} data-test-subj="dataGridColumnSortingPopover">
        {sortedColumns.length === 0 ? (
          <EuiText size="s" color="subdued" css={{ padding: 12 }}>
            {i18n.translate('kbnDataGrid.toolbar.emptySorting', {
              defaultMessage: 'Currently no fields are sorted',
            })}
          </EuiText>
        ) : (
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable droppableId="sortOrder" spacing="none">
              {sortedColumns.map(({ id, direction }: DataGridSortColumn, index) => {
                const column = columnsById.get(id)!;
                const labels = getSortLabels(column.schema);
                const removeLabel = i18n.translate('kbnDataGrid.toolbar.removeSort', {
                  defaultMessage: 'Remove {name} from sort',
                  values: { name: column.displayAsText },
                });
                return (
                  <EuiDraggable
                    key={id}
                    index={index}
                    draggableId={id}
                    customDragHandle
                    spacing="none"
                  >
                    {(provided) => (
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="s"
                        responsive={false}
                        css={{ padding: '4px 8px' }}
                        data-test-subj={`dataGridColumnSortingDraggable-${id}`}
                      >
                        <EuiFlexItem grow={false}>
                          <div
                            {...provided.dragHandleProps}
                            aria-label={i18n.translate('kbnDataGrid.toolbar.sortDragHandle', {
                              defaultMessage: 'Drag handle',
                            })}
                          >
                            <EuiIcon type="dragVertical" aria-hidden="true" />
                          </div>
                        </EuiFlexItem>
                        <EuiFlexItem css={{ wordBreak: 'break-all' }}>
                          <EuiText size="xs">{column.displayAsText}</EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonGroup
                            isDisabled={false}
                            buttonSize="compressed"
                            legend={i18n.translate('kbnDataGrid.toolbar.sortDirection', {
                              defaultMessage: 'Select sorting method for {name}',
                              values: { name: column.displayAsText },
                            })}
                            options={[
                              { id: `${id}-asc`, label: labels.asc.replace('Sort ', '') },
                              { id: `${id}-desc`, label: labels.desc.replace('Sort ', '') },
                            ]}
                            idSelected={`${id}-${direction}`}
                            onChange={(optionId) =>
                              changeDirection(id, optionId.endsWith('-asc') ? 'asc' : 'desc')
                            }
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip content={removeLabel} disableScreenReaderOutput>
                            <EuiButtonIcon
                              iconType="cross"
                              color="text"
                              size="xs"
                              aria-label={removeLabel}
                              onClick={() => onSort(sortColumns.filter((col) => col.id !== id))}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    )}
                  </EuiDraggable>
                );
              })}
            </EuiDroppable>
          </EuiDragDropContext>
        )}
        <EuiPopoverFooter paddingSize="s">
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isPickerOpen}
                closePopover={() => setIsPickerOpen(false)}
                anchorPosition="downLeft"
                panelPaddingSize="none"
                aria-label={i18n.translate('kbnDataGrid.toolbar.pickFieldsPopover', {
                  defaultMessage: 'Pick fields to sort by',
                })}
                button={
                  <EuiButtonEmpty
                    size="xs"
                    iconType="chevronSingleDown"
                    iconSide="right"
                    data-test-subj="dataGridColumnSortingSelectionButton"
                    isDisabled={unsortedColumns.length === 0}
                    onClick={() => setIsPickerOpen((open) => !open)}
                  >
                    {i18n.translate('kbnDataGrid.toolbar.pickFields', {
                      defaultMessage: 'Pick fields to sort by',
                    })}
                  </EuiButtonEmpty>
                }
              >
                <EuiSelectable
                  searchable
                  height={240}
                  searchProps={{ compressed: true }}
                  options={unsortedColumns.map(({ id, displayAsText }) => ({
                    key: id,
                    label: displayAsText,
                    'data-test-subj': `dataGridColumnSortingPopoverColumnSelection-${id}`,
                  }))}
                  onChange={(options) => {
                    const added = options.find(({ checked }) => checked === 'on');
                    if (added?.key) {
                      onSort([...sortColumns, { id: added.key, direction: 'asc' }]);
                    }
                    setIsPickerOpen(false);
                  }}
                  singleSelection
                >
                  {(list, search) => (
                    <div css={{ width: 300 }}>
                      {search}
                      {list}
                    </div>
                  )}
                </EuiSelectable>
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                color="danger"
                data-test-subj="dataGridColumnSortingClearButton"
                isDisabled={sortedColumns.length === 0}
                onClick={() => onSort([])}
              >
                {i18n.translate('kbnDataGrid.toolbar.clearSorting', {
                  defaultMessage: 'Clear sorting',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      </div>
    </EuiPopover>
  );
};
