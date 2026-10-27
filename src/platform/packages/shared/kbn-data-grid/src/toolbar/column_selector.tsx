/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import {
  EuiDataGridToolbarControl,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ColumnSelectorColumn {
  id: string;
  displayAsText: string;
}

interface ColumnSelectorProps {
  /** The columns in the order they are shown. */
  columns: ColumnSelectorColumn[];
  /** Without it the columns cannot be reordered. */
  onReorder?: (columnIds: string[]) => void;
  /** Rendered above the list of columns in the popover. */
  children?: ReactNode;
}

export const ColumnSelector = ({ columns, onReorder, children }: ColumnSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dragHandleLabel = i18n.translate('kbnDataGrid.toolbar.columnDragHandle', {
    defaultMessage: 'Drag handle',
  });

  const onDragEnd = ({
    source,
    destination,
  }: {
    source: { index: number };
    destination?: { index: number } | null;
  }) => {
    if (source && destination && onReorder) {
      onReorder(
        euiDragDropReorder(
          columns.map(({ id }) => id),
          source.index,
          destination.index
        )
      );
    }
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      aria-label={i18n.translate('kbnDataGrid.toolbar.columnsPopover', {
        defaultMessage: 'Columns',
      })}
      button={
        <EuiDataGridToolbarControl
          iconType="table"
          badgeContent={columns.length}
          data-test-subj="dataGridColumnSelectorButton"
          onClick={() => setIsOpen((open) => !open)}
        >
          {i18n.translate('kbnDataGrid.toolbar.columns', { defaultMessage: 'Columns' })}
        </EuiDataGridToolbarControl>
      }
    >
      <div css={{ minWidth: 280 }}>
        {children}
        <div
          css={{ maxHeight: 400, overflowY: 'auto' }}
          data-test-subj="dataGridColumnSelectorList"
        >
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable droppableId="columnOrder" spacing="none" isDropDisabled={!onReorder}>
              {columns.map(({ id, displayAsText }, index) => (
                <EuiDraggable
                  key={id}
                  index={index}
                  draggableId={id}
                  customDragHandle
                  isDragDisabled={!onReorder}
                  spacing="none"
                >
                  {(provided) => (
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="s"
                      responsive={false}
                      css={{ padding: '4px 8px' }}
                      data-test-subj={`dataGridColumnSelectorColumnItem-${id}`}
                    >
                      {onReorder && (
                        <EuiFlexItem grow={false}>
                          <div {...provided.dragHandleProps} aria-label={dragHandleLabel}>
                            <EuiIcon type="dragVertical" aria-hidden="true" />
                          </div>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>
                        <EuiText size="xs" css={{ wordBreak: 'break-all' }}>
                          {displayAsText}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiDragDropContext>
        </div>
      </div>
    </EuiPopover>
  );
};
