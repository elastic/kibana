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
import type { TabItem } from '../../types';
import { getTabIdAttribute } from '../../utils/get_tab_attributes';
import { useResponsiveTabs } from '../../hooks/use_responsive_tabs';

const growingFlexItemCss = css`
  min-width: 0;
`;

export type TabsBarProps = Pick<
  TabProps,
  'getTabMenuItems' | 'onLabelEdited' | 'onSelect' | 'onClose' | 'tabContentId'
> & {
  items: TabItem[];
  selectedItem: TabItem | null;
  maxItemsCount?: number;
  onAdd: () => Promise<void>;
};

export const TabsBar: React.FC<TabsBarProps> = ({
  items,
  selectedItem,
  maxItemsCount,
  tabContentId,
  getTabMenuItems,
  onAdd,
  onLabelEdited,
  onSelect,
  onClose,
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

  return (
    <EuiFlexGroup
      role="tablist"
      data-test-subj="unifiedTabs_tabsBar"
      responsive={false}
      alignItems="center"
      gutterSize="s"
      css={css`
        background-color: ${euiTheme.colors.lightestShade};
        padding-right: ${euiTheme.size.xs};
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
                <EuiFlexItem key={item.id} grow={false}>
                  <Tab
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    tabContentId={tabContentId}
                    tabsSizeConfig={tabsSizeConfig}
                    getTabMenuItems={getTabMenuItems}
                    onLabelEdited={onLabelEdited}
                    onSelect={onSelect}
                    onClose={items.length > 1 ? onClose : undefined} // prevents closing the last tab
                  />
                </EuiFlexItem>
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
};
