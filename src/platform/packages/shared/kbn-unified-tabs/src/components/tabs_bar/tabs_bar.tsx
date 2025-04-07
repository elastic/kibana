/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { Tab, type TabProps } from '../tab';
import type { TabItem, TabsServices } from '../../types';
import { getTabIdAttribute } from '../../utils/get_tab_attributes';
import { useResponsiveTabs } from '../../hooks/use_responsive_tabs';
import { TabsBarWithBackground } from '../tabs_visual_glue_to_header/tabs_bar_with_background';
import { TabsBarMenu } from '../tabs_bar_menu';

const growingFlexItemCss = css`
  min-width: 0;
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
};

export const TabsBar: React.FC<TabsBarProps> = ({
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
      }
    }
  }, [selectedItem]);

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
            <EuiFlexGroup
              ref={setTabsContainerElement}
              direction="row"
              gutterSize="none"
              alignItems="center"
              responsive={false}
              css={tabsContainerCss}
            >
              {items.map((item) => (
                <Tab
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  tabContentId={tabContentId}
                  tabsSizeConfig={tabsSizeConfig}
                  services={services}
                  getTabMenuItems={getTabMenuItems}
                  getPreviewData={getPreviewData}
                  onLabelEdited={onLabelEdited}
                  onSelect={onSelect}
                  onClose={items.length > 1 ? onClose : undefined} // prevents closing the last tab
                />
              ))}
            </EuiFlexGroup>
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
        <TabsBarMenu
          openedItems={items}
          selectedItem={selectedItem}
          onSelectOpenedTab={onSelect}
          recentlyClosedItems={recentlyClosedItems}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <TabsBarWithBackground role="tablist" data-test-subj="unifiedTabs_tabsBar" services={services}>
      {mainTabsBarContent}
    </TabsBarWithBackground>
  );
};
