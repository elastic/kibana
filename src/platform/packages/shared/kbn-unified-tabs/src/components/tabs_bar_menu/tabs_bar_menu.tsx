/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Do we restore tab if one of "recently closed" tabs is clicked?

// If so, should it be removed from "recently closed" and added to "opened tabs"?

// Where should object mapping happen (TabItem and EuiSelectableOptions have different shape)?

// In EUI examples selectable list state is managed in a local useState, but we need to keep it in sync with TabsBar
// eg. adding a new tab should add it to the list of opened tabs - what's your take on this?

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

interface TabsBarMenuProps {
  onSelect: TabsBarProps['onSelect'];
  selectedTab: TabsBarProps['selectedItem'];
  openedTabs: TabsBarProps['items'];
}

export const TabsBarMenu: React.FC<TabsBarMenuProps> = ({ openedTabs, selectedTab, onSelect }) => {
  const openedTabsList = useMemo(
    () => getOpenedTabsList(openedTabs, selectedTab),
    [openedTabs, selectedTab]
  );

  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<EuiSelectableOption[]>([
    {
      label: 'Session 4',
    },
    {
      label: 'Session 5',
      checked: 'on',
    },
    {
      label: 'Session 6',
    },
  ]);
  const [isPopoverOpen, setPopover] = useState(false);
  const contextMenuPopoverId = useGeneratedHtmlId();

  const menuButtonLabel = i18n.translate('unifiedTabs.tabsBarMenuButton', {
    defaultMessage: 'Tabs bar menu',
  });

  const closePopover = useCallback(() => {
    setPopover(false);
  }, [setPopover]);

  return (
    <EuiPopover
      id={contextMenuPopoverId}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      hasArrow={false}
      button={
        <EuiButtonIcon
          aria-label={menuButtonLabel}
          title={menuButtonLabel}
          color="text"
          data-test-subj="unifiedTabs_tabsBarMenuButton"
          iconType="boxesVertical"
          onClick={() => setPopover((prev) => !prev)}
        />
      }
    >
      <EuiSelectable
        aria-label={i18n.translate('unifiedTabs.openedTabsList', {
          defaultMessage: 'Opened tabs list',
        })}
        options={openedTabsList}
        onChange={(newOptions) => {
          const clickedTabId = newOptions.find((option) => option.checked)?.key;
          const tabToNavigate = openedTabs.find((tab) => tab.id === clickedTabId);
          if (tabToNavigate) {
            onSelect(tabToNavigate);
          }
        }}
        singleSelection="always"
        css={listCss}
        listProps={{
          onFocusBadge: false,
        }}
      >
        {(tabs) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('unifiedTabs.openedTabs', {
                defaultMessage: 'Opened tabs',
              })}
            </EuiPopoverTitle>
            {tabs}
          </>
        )}
      </EuiSelectable>
      <EuiHorizontalRule margin="none" />
      <EuiSelectable
        aria-label={i18n.translate('unifiedTabs.recentlyClosedTabsList', {
          defaultMessage: 'Recently closed tabs list',
        })}
        options={recentlyClosedTabs}
        onChange={() => {
          console.log('restore tab'); // TODO restore closet tab0
        }}
        singleSelection={true}
        css={listCss}
        listProps={{
          onFocusBadge: false,
        }}
      >
        {(tabs) => (
          <>
            <EuiPopoverTitle paddingSize="s">
              {i18n.translate('unifiedTabs.recentlyClosed', {
                defaultMessage: 'Recently closed',
              })}
            </EuiPopoverTitle>
            {tabs}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const listCss = css`
  width: 240px;
`;
