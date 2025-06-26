/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
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
  EuiToolTip,
  euiDragDropReorder,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import { Tab, type TabProps } from '../tab';
import type { TabItem, TabsServices } from '../../types';
import { getTabIdAttribute } from '../../utils/get_tab_attributes';
import { useResponsiveTabs } from '../../hooks/use_responsive_tabs';
import { TabsBarWithBackground } from '../tabs_visual_glue_to_header/tabs_bar_with_background';
import { TabsBarMenu, type TabsBarMenuProps } from '../tabs_bar_menu';

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
  'getTabMenuItems' | 'getPreviewData' | 'onLabelEdited' | 'onSelect' | 'onClose' | 'tabContentId'
> & {
  items: TabItem[];
  selectedItem: TabItem | null;
  recentlyClosedItems: TabItem[];
  maxItemsCount?: number;
  services: TabsServices;
  onAdd: () => Promise<void>;
  onSelectRecentlyClosed: TabsBarMenuProps['onSelectRecentlyClosed'];
  onReorder: (items: TabItem[]) => void;
};

export interface TabsBarApi {
  moveFocusToNextSelectedItem: (item: TabItem) => void;
}

export const TabsBar = forwardRef<TabsBarApi, TabsBarProps>(
  (
    {
      items,
      selectedItem,
      recentlyClosedItems,
      maxItemsCount,
      tabContentId,
      getTabMenuItems,
      services,
      onAdd,
      onLabelEdited,
      onSelect,
      onSelectRecentlyClosed,
      onReorder,
      onClose,
      getPreviewData,
    },
    componentRef
  ) => {
    const { euiTheme } = useEuiTheme();
    const [tabsContainerWithPlusElement, setTabsContainerWithPlusElement] =
      useState<HTMLDivElement | null>(null);
    const [tabsContainerElement, setTabsContainerElement] = useState<HTMLDivElement | null>(null);
    const tabsContainerRef = useRef<HTMLDivElement | null>(null);
    tabsContainerRef.current = tabsContainerElement;
    const hasReachedMaxItemsCount = maxItemsCount ? items.length >= maxItemsCount : false;
    const moveFocusToItemIdRef = useRef<string | null>(null);

    const moveFocusToNextSelectedItem = useCallback((item: TabItem) => {
      moveFocusToItemIdRef.current = item.id;
    }, []);

    useImperativeHandle(
      componentRef,
      () => ({
        moveFocusToNextSelectedItem,
      }),
      [moveFocusToNextSelectedItem]
    );

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
          selectedTab.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });

          if (moveFocusToItemIdRef.current === selectedItem.id) {
            (selectedTab as HTMLDivElement).focus();
            moveFocusToItemIdRef.current = null;
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
          moveFocusToItemIdRef.current = item.id;
          await onSelect(item);
        }
      },
      [items, selectedItem, onSelect]
    );

    const onSelectedTabKeyDown = useCallback(
      async (event: KeyboardEvent<HTMLDivElement>) => {
        const firstItemIndex = 0;
        const lastItemIndex = items.length - 1;

        const selectedItemIndex = items.findIndex((item) => item.id === selectedItem?.id);
        if (selectedItemIndex < 0) {
          return;
        }

        if (event.key === keys.ARROW_LEFT) {
          await selectAndMoveFocusToItemIndex(
            selectedItemIndex > 0 ? selectedItemIndex - 1 : lastItemIndex
          );
          return;
        }

        if (event.key === keys.ARROW_RIGHT) {
          await selectAndMoveFocusToItemIndex(
            selectedItemIndex < lastItemIndex ? selectedItemIndex + 1 : firstItemIndex
          );
          return;
        }

        if (event.key === keys.HOME && items.length > 0) {
          await selectAndMoveFocusToItemIndex(0);
          return;
        }

        if (event.key === keys.END && items.length > 0) {
          await selectAndMoveFocusToItemIndex(lastItemIndex);
          return;
        }

        if (
          (event.key === 'Delete' || event.key === keys.BACKSPACE) &&
          selectedItem &&
          items.length > 1
        ) {
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
          padding-right: ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem ref={setTabsContainerWithPlusElement} grow css={growingFlexItemCss}>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false} css={growingFlexItemCss}>
              <div ref={setTabsContainerElement} role="tablist" css={tabsContainerCss}>
                <EuiDragDropContext onDragEnd={onDragEnd}>
                  <EuiDroppable
                    droppableId={DROPPABLE_ID}
                    direction="horizontal"
                    css={droppableCss}
                    grow
                  >
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
                              getPreviewData={getPreviewData}
                              onLabelEdited={onLabelEdited}
                              onSelect={onSelect}
                              onSelectedTabKeyDown={onSelectedTabKeyDown}
                              onClose={items.length > 1 ? onClose : undefined} // prevents closing the last tab
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
                <EuiToolTip content={addButtonLabel}>
                  <EuiButtonIcon
                    data-test-subj="unifiedTabs_tabsBar_newTabBtn"
                    iconType="plus"
                    color="text"
                    aria-label={addButtonLabel}
                    onClick={onAdd}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TabsBarMenu
            items={items}
            selectedItem={selectedItem}
            recentlyClosedItems={recentlyClosedItems}
            onSelect={onSelect}
            onSelectRecentlyClosed={onSelectRecentlyClosed}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <TabsBarWithBackground data-test-subj="unifiedTabs_tabsBar" services={services}>
        {mainTabsBarContent}
      </TabsBarWithBackground>
    );
  }
);
