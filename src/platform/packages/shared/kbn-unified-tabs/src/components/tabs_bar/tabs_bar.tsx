/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  euiDragDropReorder,
  DropResult,
} from '@elastic/eui';
import { Tab } from '../tab';
import type { TabItem } from '../../types';

const DROPPABLE_ID = 'unifiedTabsOrder';

export interface TabsBarProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  tabContentId: string;
  onAdd: () => void;
  onReorder: (items: TabItem[]) => void;
  onSelect: (item: TabItem) => void;
  onClose: (item: TabItem) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  tabContentId,
  onAdd,
  onReorder,
  onSelect,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();

  const addButtonLabel = i18n.translate('unifiedTabs.createTabButton', {
    defaultMessage: 'New',
  });

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (source && destination) {
        const reorderedItems = euiDragDropReorder(items, source.index, destination.index);

        onReorder(reorderedItems);
      }
    },
    [items, onReorder]
  );

  return (
    <EuiFlexGroup
      role="tablist"
      data-test-subj="unifiedTabs_tabsBar"
      alignItems="center"
      className="eui-scrollBar"
      gutterSize="none"
      responsive={false}
      wrap={false}
      css={css`
        background-color: ${euiTheme.colors.lightestShade};
        overflow-x: auto;
        min-height: ${euiTheme.size.xl};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable
            droppableId={DROPPABLE_ID}
            direction="horizontal"
            css={css`
              display: flex;
              align-items: center;
              wrap: no-wrap;
            `}
          >
            {(_, { isDraggingOver }) =>
              items.map((item, index) => (
                <EuiDraggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                  hasInteractiveChildren
                  usePortal
                >
                  {(provided, state) => (
                    <Tab
                      item={item}
                      isDragging={state.isDragging}
                      isDraggedOver={!state.isDragging && isDraggingOver}
                      isSelected={selectedItem?.id === item.id}
                      tabContentId={tabContentId}
                      onSelect={onSelect}
                      onClose={onClose}
                    />
                  )}
                </EuiDraggable>
              ))
            }
          </EuiDroppable>
        </EuiDragDropContext>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="unifiedTabs_tabsBar_newTabBtn"
          iconType="plus"
          color="text"
          css={css`
            margin-inline: ${euiTheme.size.s};
          `}
          aria-label={addButtonLabel}
          title={addButtonLabel}
          onClick={onAdd}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
