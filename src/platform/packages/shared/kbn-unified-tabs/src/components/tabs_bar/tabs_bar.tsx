/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  DropResult,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  euiDragDropReorder,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import { Tab, type TabProps } from '../tab';
import type { TabItem, TabsServices, TabPreviewData } from '../../types';
import { getTabIdAttribute } from '../../utils/get_tab_attributes';
import { useResponsiveTabs } from '../../hooks/use_responsive_tabs';
import { TabsBarWithBackground } from '../tabs_visual_glue_to_header/tabs_bar_with_background';

const DROPPABLE_ID = 'unifiedTabsOrder';

const growingFlexItemCss = css`
  min-width: 0;
`;

const droppableCss = css`
  display: flex;
  align-items: center;
  wrap: no-wrap;
`;

export type TabsBarProps = Pick<
  TabProps,
  'getTabMenuItems' | 'onLabelEdited' | 'onSelect' | 'onClose' | 'tabContentId'
> & {
  items: TabItem[];
  selectedItem: TabItem | null;
  maxItemsCount?: number;
  services: TabsServices;
  onAdd: () => Promise<void>;
  onReorder: (items: TabItem[]) => void;
  getPreviewData: (item: TabItem) => TabPreviewData;
};

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  maxItemsCount,
  tabContentId,
  getTabMenuItems,
  services,
  onAdd,
  onLabelEdited,
  onSelect,
  onReorder,
  onClose,
  getPreviewData,
}) => {
  const { euiTheme } = useEuiTheme();
  const [tabsContainerWithPlusElement, setTabsContainerWithPlusElement] =
    useState<HTMLDivElement | null>(null);
  const [tabsContainerElement, setTabsContainerElement] = useState<HTMLDivElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  tabsContainerRef.current = tabsContainerElement;
  const hasReachedMaxItemsCount = maxItemsCount ? items.length >= maxItemsCount : false;
  const moveFocusToSelectedItemRef = useRef<boolean>(false);

  const addButtonLabel = i18n.translate('unifiedTabs.createTabButton', {
    defaultMessage: 'New session',
  });

  const { tabsSizeConfig, scrollRightButton, scrollLeftButton, tabsContainerCss } =
    useResponsiveTabs({
      items,
      hasReachedMaxItemsCount,
      tabsContainerWithPlusElement,
      tabsContainerElement,
    });

  useEffect(() => {
    if (selectedItem && tabsContainerRef.current) {
      const selectedTab = tabsContainerRef.current.querySelector(
        `#${getTabIdAttribute(selectedItem)}`
      );
      if (selectedTab) {
        selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        if (moveFocusToSelectedItemRef.current) {
          (selectedTab as HTMLDivElement).focus();
          moveFocusToSelectedItemRef.current = false;
        }
      }
    }
  }, [selectedItem]);

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (source && destination) {
        const reorderedItems = euiDragDropReorder(items, source.index, destination.index);

        onReorder(reorderedItems);
      }
    },
    [items, onReorder]
  );

  const selectAndMoveFocusToItemIndex = useCallback(
    async (itemIndex: number) => {
      const item = items[itemIndex];

      if (item && item.id !== selectedItem?.id) {
        moveFocusToSelectedItemRef.current = true;
        await onSelect(item);
      }
    },
    [items, selectedItem, onSelect]
  );

  const onSelectedTabKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLDivElement>) => {
      const selectedItemIndex = items.findIndex((item) => item.id === selectedItem?.id);
      if (selectedItemIndex < 0) {
        return;
      }

      if (event.key === keys.ARROW_LEFT && selectedItemIndex > 0) {
        await selectAndMoveFocusToItemIndex(selectedItemIndex - 1);
        return;
      }

      if (event.key === keys.ARROW_RIGHT && selectedItemIndex < items.length - 1) {
        await selectAndMoveFocusToItemIndex(selectedItemIndex + 1);
        return;
      }

      if (event.key === keys.HOME && items.length > 0) {
        await selectAndMoveFocusToItemIndex(0);
        return;
      }

      if (event.key === keys.END && items.length > 0) {
        await selectAndMoveFocusToItemIndex(items.length - 1);
        return;
      }

      if (
        (event.key === keys.BACKSPACE || event.key === 'Delete') &&
        selectedItem &&
        items.length > 1
      ) {
        moveFocusToSelectedItemRef.current = true;
        await onClose?.(selectedItem);
        return;
      }
    },
    [items, selectedItem, selectAndMoveFocusToItemIndex, onClose]
  );

  const mainTabsBarContent = (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      gutterSize="s"
      css={css`
        padding-right: ${euiTheme.size.xs};
      `}
    >
      <EuiFlexItem ref={setTabsContainerWithPlusElement} grow css={growingFlexItemCss}>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={growingFlexItemCss}>
            <div ref={setTabsContainerElement} role="tablist" css={tabsContainerCss}>
              <EuiDragDropContext onDragEnd={onDragEnd}>
                <EuiDroppable droppableId={DROPPABLE_ID} direction="horizontal" css={droppableCss}>
                  {() =>
                    items.map((item, index) => (
                      <EuiDraggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                        usePortal
                        hasInteractiveChildren
                        customDragHandle="custom"
                      >
                        {({ dragHandleProps }, { isDragging }) => (
                          <Tab
                            key={item.id}
                            item={item}
                            isSelected={selectedItem?.id === item.id}
                            isDragging={isDragging}
                            dragHandleProps={dragHandleProps}
                            tabContentId={tabContentId}
                            tabsSizeConfig={tabsSizeConfig}
                            services={services}
                            getTabMenuItems={getTabMenuItems}
                            onLabelEdited={onLabelEdited}
                            onSelect={onSelect}
                            onSelectedTabKeyDown={onSelectedTabKeyDown}
                            onClose={items.length > 1 ? onClose : undefined} // prevents closing the last tab
                            tabPreviewData={getPreviewData(item)}
                          />
                        )}
                      </EuiDraggable>
                    ))
                  }
                </EuiDroppable>
              </EuiDragDropContext>
            </div>
          </EuiFlexItem>
          {!!scrollLeftButton && <EuiFlexItem grow={false}>{scrollLeftButton}</EuiFlexItem>}
          {!!scrollRightButton && <EuiFlexItem grow={false}>{scrollRightButton}</EuiFlexItem>}
          {!hasReachedMaxItemsCount && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="unifiedTabs_tabsBar_newTabBtn"
                iconType="plus"
                color="text"
                aria-label={addButtonLabel}
                title={addButtonLabel}
                onClick={onAdd}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="boxesVertical"
          color="text"
          aria-label="Tabs menu placeholder"
          title="Tabs menu placeholder"
          onClick={() => alert('TODO: Implement tabs menu')}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <TabsBarWithBackground data-test-subj="unifiedTabs_tabsBar" services={services}>
      {mainTabsBarContent}
    </TabsBarWithBackground>
  );
};
