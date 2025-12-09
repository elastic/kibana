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
import type { TabItem } from '../../types';

interface OptionData {
  closedAt?: moment.Moment;
}

type RecentlyClosedTabOption = EuiSelectableOption<OptionData>;

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

const getRecentlyClosedTabsList = (tabItems: TabItem[]): RecentlyClosedTabOption[] => {
  return tabItems.map((tab) => {
    const closedAt = 'closedAt' in tab && tab.closedAt ? moment(tab.closedAt) : undefined;
    const option = {
      label: tab.label,
      title: `${tab.label}${closedAt?.isValid() ? ` (${closedAt.format('LL LT')})` : ''}`,
      key: tab.id,
      'data-test-subj': `unifiedTabs_tabsMenu_recentlyClosedTab_${tab.id}`,
      data: {
        closedAt,
      },
    };
    return option;
  });
};

export interface TabsBarMenuProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  recentlyClosedItems: TabItem[];
  onSelect: (item: TabItem) => Promise<void>;
  onSelectRecentlyClosed: (item: TabItem) => Promise<void>;
  onClearRecentlyClosed: () => void;
}

export const TabsBarMenu: React.FC<TabsBarMenuProps> = React.memo(
  ({
    items,
    selectedItem,
    recentlyClosedItems,
    onSelect,
    onSelectRecentlyClosed,
    onClearRecentlyClosed,
  }) => {
    const { euiTheme } = useEuiTheme();

    const openedTabsList = useMemo(
      () => getOpenedTabsList(items, selectedItem),
      [items, selectedItem]
    );
    const recentlyClosedTabsList = useMemo(
      () => getRecentlyClosedTabsList(recentlyClosedItems),
      [recentlyClosedItems]
    );

    const [isPopoverOpen, setPopover] = useState(false);
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

    const renderRecentlyClosedOption = useCallback((option: EuiSelectableOption<OptionData>) => {
      const closedAt = option?.closedAt;
      const formattedTime = closedAt?.isValid() ? closedAt.fromNow() : '';

      return (
        <>
          {option.label}
          {formattedTime && (
            <EuiText size="xs" color="subdued" className="eui-displayBlock">
              {formattedTime}
            </EuiText>
          )}
        </>
      );
    }, []);

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
              renderOption={renderRecentlyClosedOption}
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
