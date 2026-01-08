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
import moment from 'moment';
import type { EuiSelectableOption, EuiSelectableOptionsListProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiPopover,
  useGeneratedHtmlId,
  EuiSelectable,
  EuiPopoverTitle,
  EuiHorizontalRule,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { RecentlyClosedTabItem, TabPreviewData } from '../../types';
import type { TabItem } from '../../types';
import { TabPreview } from '../tab_preview';

interface OptionData {
  tabItem: RecentlyClosedTabItem | TabItem;
  momentClosedAt?: moment.Moment;
}

const getOpenedTabsList = (
  tabItems: TabItem[],
  selectedTab: TabItem | null
): EuiSelectableOption<OptionData>[] => {
  return tabItems.map((tab) => ({
    label: tab.label,
    checked: selectedTab && tab.id === selectedTab.id ? 'on' : undefined,
    key: tab.id,
    tabItem: tab,
  }));
};

const getRecentlyClosedTabsList = (
  tabItems: RecentlyClosedTabItem[]
): Array<EuiSelectableOption<OptionData>> => {
  return tabItems.map((tab) => {
    const momentClosedAt = moment(tab.closedAt);
    return {
      label: tab.label,
      key: tab.id,
      'data-test-subj': `unifiedTabs_tabsMenu_recentlyClosedTab_${tab.id}`,
      tabItem: tab,
      momentClosedAt,
    };
  });
};

export interface TabsBarMenuProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  recentlyClosedItems: RecentlyClosedTabItem[];
  getPreviewData?: (item: TabItem) => TabPreviewData;
  onSelect: (item: TabItem) => Promise<void>;
  onSelectRecentlyClosed: (item: RecentlyClosedTabItem) => Promise<void>;
  onClearRecentlyClosed: () => void;
}

export const TabsBarMenu: React.FC<TabsBarMenuProps> = React.memo(
  ({
    items,
    selectedItem,
    recentlyClosedItems,
    getPreviewData,
    onSelect,
    onSelectRecentlyClosed,
    onClearRecentlyClosed,
  }) => {
    const { euiTheme } = useEuiTheme();

    const openedTabsList: EuiSelectableOption<OptionData>[] = useMemo(
      () => getOpenedTabsList(items, selectedItem),
      [items, selectedItem]
    );
    const recentlyClosedTabsList = useMemo(
      () => getRecentlyClosedTabsList(recentlyClosedItems),
      [recentlyClosedItems]
    );

    const [isPopoverOpen, setPopover] = useState(false);
    const [previewTabId, setPreviewTabId] = useState<string | null>(null);
    const contextMenuPopoverId = useGeneratedHtmlId();

    const menuButtonLabel = i18n.translate('unifiedTabs.tabsBarMenu.tabsBarMenuButton', {
      defaultMessage: 'Tabs menu',
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

    const renderOption = useCallback(
      (option: EuiSelectableOption<OptionData>) => {
        const closedAt = option?.momentClosedAt;
        const formattedTime = closedAt?.isValid() ? closedAt.fromNow() : '';

        const itemContents = (
          <>
            {option.label}
            {formattedTime && (
              <EuiText size="xs" color="subdued" className="eui-displayBlock">
                {formattedTime}
              </EuiText>
            )}
          </>
        );

        if (!getPreviewData) {
          return itemContents;
        }

        const previewData = getPreviewData(option.tabItem);

        return (
          <TabPreview
            showPreview={previewTabId === option.key}
            setShowPreview={() =>
              setPreviewTabId((prev) => (prev === option.key ? null : (option.key as string)))
            }
            tabItem={{ id: option.key as string, label: option.label }}
            previewData={previewData}
            previewDelay={0}
            position="left"
          >
            <div>{itemContents}</div>
          </TabPreview>
        );
      },
      [previewTabId, getPreviewData]
    );

    return (
      <EuiPopover
        data-test-subj="unifiedTabs_tabsBarMenu"
        id={contextMenuPopoverId}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        hasArrow={false}
        buffer={0}
        panelProps={{
          css: popoverCss,
          ['data-test-subj']: 'unifiedTabs_tabsBarMenuPanel',
        }}
        button={
          <EuiToolTip content={menuButtonLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={menuButtonLabel}
              color="text"
              data-test-subj="unifiedTabs_tabsBarMenuButton"
              iconType="arrowDown"
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
            const tabToNavigate = items.find((tab) => tab.id === clickedTabId);
            if (tabToNavigate) {
              onSelect(tabToNavigate);
              closePopover();
            }
          }}
          renderOption={renderOption}
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
              singleSelection={true}
              listProps={{
                ...selectableListProps,
                rowHeight: parseInt(euiTheme.size.xxxl, 10),
              }}
              renderOption={renderOption}
              onChange={(newOptions) => {
                const clickedTabId = newOptions.find((option) => option.checked)?.key;
                const tabToNavigate = recentlyClosedItems.find((tab) => tab.id === clickedTabId);
                if (tabToNavigate) {
                  onSelectRecentlyClosed(tabToNavigate);
                  closePopover();
                }
              }}
            >
              {(tabs) => (
                <>
                  <EuiPopoverTitle paddingSize="s">
                    <EuiFlexGroup
                      responsive={false}
                      alignItems="center"
                      gutterSize="s"
                      justifyContent="spaceBetween"
                    >
                      <EuiFlexItem grow>
                        {i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosed', {
                          defaultMessage: 'Recently closed',
                        })}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          flush="both"
                          data-test-subj="unifiedTabs_tabsMenu_clearRecentlyClosed"
                          aria-label={i18n.translate(
                            'unifiedTabs.tabsBarMenu.clearRecentlyClosed',
                            {
                              defaultMessage: 'Clear',
                            }
                          )}
                          onClick={onClearRecentlyClosed}
                        >
                          {i18n.translate('unifiedTabs.tabsBarMenu.clearRecentlyClosed', {
                            defaultMessage: 'Clear',
                          })}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
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
