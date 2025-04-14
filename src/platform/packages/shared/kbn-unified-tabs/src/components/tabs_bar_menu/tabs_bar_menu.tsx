/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiPopover,
  useGeneratedHtmlId,
  EuiSelectableOption,
  EuiSelectable,
  EuiPopoverTitle,
  EuiHorizontalRule,
  EuiToolTip,
  EuiSelectableOptionsListProps,
} from '@elastic/eui';
import type { TabItem } from '../../types';
import type { TabsBarProps } from '../tabs_bar';

const getOpenedTabsList = (
  tabItems: TabItem[],
  selectedTab: TabItem | null
): EuiSelectableOption[] => {
  return tabItems.map((tab) => ({
    label: tab.label,
    checked: selectedTab && tab.id === selectedTab.id ? 'on' : undefined,
    key: tab.id,
  }));
};

const getRecentlyClosedTabsList = (tabItems: TabItem[]): EuiSelectableOption[] => {
  return tabItems.map((tab) => ({
    label: tab.label,
    key: tab.id,
  }));
};

interface TabsBarMenuProps {
  onSelectOpenedTab: TabsBarProps['onSelect'];
  selectedItem: TabsBarProps['selectedItem'];
  openedItems: TabsBarProps['items'];
  recentlyClosedItems: TabsBarProps['recentlyClosedItems'];
}

export const TabsBarMenu: React.FC<TabsBarMenuProps> = React.memo(
  ({ openedItems, selectedItem, onSelectOpenedTab, recentlyClosedItems }) => {
    const openedTabsList = useMemo(
      () => getOpenedTabsList(openedItems, selectedItem),
      [openedItems, selectedItem]
    );
    const recentlyClosedTabsList = useMemo(
      () => getRecentlyClosedTabsList(recentlyClosedItems),
      [recentlyClosedItems]
    );

    const [isPopoverOpen, setPopover] = useState(false);
    const contextMenuPopoverId = useGeneratedHtmlId();

    const menuButtonLabel = i18n.translate('unifiedTabs.tabsBarMenu.tabsBarMenuButton', {
      defaultMessage: 'Tabs bar menu',
    });

    const closePopover = useCallback(() => {
      setPopover(false);
    }, [setPopover]);

    const selectableListProps = {
      onFocusBadge: false,
      truncationProps: {
        truncation: 'middle',
      },
    } as Partial<EuiSelectableOptionsListProps>;

    return (
      <EuiPopover
        data-test-subj="unifiedTabs_tabsBarMenu"
        id={contextMenuPopoverId}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        hasArrow={false}
        panelProps={{
          css: popoverCss,
        }}
        button={
          <EuiToolTip content={menuButtonLabel}>
            <EuiButtonIcon
              aria-label={menuButtonLabel}
              color="text"
              data-test-subj="unifiedTabs_tabsBarMenuButton"
              iconType="boxesVertical"
              onClick={() => setPopover((prev) => !prev)}
            />
          </EuiToolTip>
        }
      >
        <EuiSelectable
          aria-label={i18n.translate('unifiedTabs.tabsBarMenu.openedTabsList', {
            defaultMessage: 'Opened tabs list',
          })}
          options={openedTabsList}
          onChange={(newOptions) => {
            const clickedTabId = newOptions.find((option) => option.checked)?.key;
            const tabToNavigate = openedItems.find((tab) => tab.id === clickedTabId);
            if (tabToNavigate) {
              onSelectOpenedTab(tabToNavigate);
              closePopover();
            }
          }}
          singleSelection="always"
          listProps={selectableListProps}
        >
          {(tabs) => (
            <>
              <EuiPopoverTitle paddingSize="s">
                {i18n.translate('unifiedTabs.tabsBarMenu.openedItems', {
                  defaultMessage: 'Opened tabs',
                })}
              </EuiPopoverTitle>
              {tabs}
            </>
          )}
        </EuiSelectable>
        {recentlyClosedItems.length > 0 && (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiSelectable
              aria-label={i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosedTabsList', {
                defaultMessage: 'Recently closed tabs list',
              })}
              options={recentlyClosedTabsList}
              onChange={() => {
                alert('restore tab'); // TODO restore closed tab
                closePopover();
              }}
              singleSelection={true}
              listProps={selectableListProps}
            >
              {(tabs) => (
                <>
                  <EuiPopoverTitle paddingSize="s">
                    {i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosed', {
                      defaultMessage: 'Recently closed',
                    })}
                  </EuiPopoverTitle>
                  {tabs}
                </>
              )}
            </EuiSelectable>
          </>
        )}
      </EuiPopover>
    );
  }
);

const popoverCss = css`
  width: 240px;
`;
