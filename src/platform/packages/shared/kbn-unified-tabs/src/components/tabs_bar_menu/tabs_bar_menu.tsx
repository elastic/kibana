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
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuItem,
  EuiPopover,
  useGeneratedHtmlId,
  EuiPopoverTitle,
  EuiHorizontalRule,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiTextTruncate,
} from '@elastic/eui';
import type {
  EuiContextMenuItemProps,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { RecentlyClosedTabItem, TabPreviewData } from '../../types';
import type { TabItem } from '../../types';
import { TabPreview } from '../tab_preview';

const OPENED_TABS_ROOT_PANEL_ID = 'openedTabsRoot';
const RECENTLY_CLOSED_ROOT_PANEL_ID = 'recentlyClosedRoot';

export const testSubj = {
  tabsBarMenu: 'unifiedTabs_tabsBarMenu',
  tabsBarMenuPanel: 'unifiedTabs_tabsBarMenuPanel',
  tabsBarMenuButton: 'unifiedTabs_tabsBarMenuButton',
  openedTabsContextMenu: 'unifiedTabs_tabsMenu_openedTabsContextMenu',
  clearRecentlyClosed: 'unifiedTabs_tabsMenu_clearRecentlyClosed',
  recentlyClosedContextMenu: 'unifiedTabs_tabsMenu_recentlyClosedContextMenu',
  restoreAllTabs: 'unifiedTabs_tabsMenu_restoreAllTabs',
  openedTab: (id: string) => `unifiedTabs_tabsMenu_openedTab_${id}`,
  recentlyClosedTab: (id: string) => `unifiedTabs_tabsMenu_recentlyClosedTab_${id}`,
  recentlyClosedGroup: (closedAt: number) => `unifiedTabs_tabsMenu_recentlyClosedGroup_${closedAt}`,
  recentlyClosedGroupTab: (id: string) => `unifiedTabs_tabsMenu_recentlyClosedGroupTab_${id}`,
};

const getRecentlyClosedGroupPanelId = (closedAt: number) => `recentlyClosedGroup_${closedAt}`;

const groupRecentlyClosedItems = (recentlyClosedItems: RecentlyClosedTabItem[]) => {
  // Group by closedAt (batch close), while preserving incoming item order per group.
  const groups = Map.groupBy(recentlyClosedItems, (item) => item.closedAt);
  return [...groups].sort(([a], [b]) => b - a).map(([closedAt, items]) => ({ closedAt, items }));
};

const getRestoreDisabledTooltipProps = (
  disabled: boolean
): Pick<EuiContextMenuItemProps, 'toolTipContent' | 'toolTipProps'> => ({
  toolTipContent: disabled
    ? i18n.translate('unifiedTabs.tabsBarMenu.restoreDisabledAtLimit', {
        defaultMessage:
          "You've reached the tab limit. Close a tab to restore recently closed tabs.",
      })
    : undefined,
  toolTipProps: { position: 'right' },
});

interface TabPanelItemParams {
  key: string;
  tab: TabItem;
  contents: React.ReactNode;
  onClick: () => void;
  dataTestSubj: string;
  icon?: string;
  ariaCurrent?: 'true';
  disabled?: boolean;
}

export interface TabsBarMenuProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  recentlyClosedItems: RecentlyClosedTabItem[];
  hasReachedMaxItemsCount: boolean;
  getPreviewData?: (item: TabItem) => TabPreviewData;
  onSelect: (item: TabItem) => Promise<void>;
  onSelectRecentlyClosed: (item: RecentlyClosedTabItem) => Promise<void>;
  onRestoreRecentlyClosedGroup: (items: RecentlyClosedTabItem[]) => Promise<void>;
  onClearRecentlyClosed: () => void;
}

export const TabsBarMenu: React.FC<TabsBarMenuProps> = React.memo(
  ({
    items,
    selectedItem,
    recentlyClosedItems,
    hasReachedMaxItemsCount,
    getPreviewData,
    onSelect,
    onSelectRecentlyClosed,
    onRestoreRecentlyClosedGroup,
    onClearRecentlyClosed,
  }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [previewTabId, setPreviewTabId] = useState<string | null>(null);
    const [menuOpenedAt, setMenuOpenedAt] = useState<number | null>(null);
    const contextMenuPopoverId = useGeneratedHtmlId();
    const styles = useMemoCss(componentStyles);

    const menuButtonLabel = i18n.translate('unifiedTabs.tabsBarMenu.tabsBarMenuButton', {
      defaultMessage: 'Tabs menu',
    });

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
      setPreviewTabId(null);
    }, [setIsPopoverOpen]);

    const getTabItemContents = useCallback(
      (label: string, formattedTime?: string, includeTimeLine = Boolean(formattedTime)) => {
        return (
          <>
            {/* title set to undefined to disable default tooltip */}
            <EuiTextTruncate truncation="middle" text={label} title={undefined} />
            {includeTimeLine && formattedTime ? (
              <EuiText size="xs" color="subdued" className="eui-displayBlock">
                {formattedTime}
              </EuiText>
            ) : null}
          </>
        );
      },
      []
    );

    const renderTabPanelItem = useCallback(
      ({
        tab,
        contents,
        onClick,
        dataTestSubj,
        icon,
        ariaCurrent,
        disabled = false,
      }: TabPanelItemParams) => {
        const menuItem = (
          <EuiContextMenuItem
            icon={icon}
            size="s"
            onClick={onClick}
            data-test-subj={dataTestSubj}
            aria-current={ariaCurrent}
            disabled={disabled}
            {...getRestoreDisabledTooltipProps(disabled)}
          >
            {contents}
          </EuiContextMenuItem>
        );

        if (!getPreviewData) {
          return menuItem;
        }

        return (
          <TabPreview
            showPreview={previewTabId === tab.id}
            setShowPreview={(show) => setPreviewTabId(show ? tab.id : null)}
            tabItem={{ id: tab.id, label: tab.label }}
            previewData={getPreviewData(tab)}
            previewDelay={0}
            position="left"
          >
            {menuItem}
          </TabPreview>
        );
      },
      [getPreviewData, previewTabId]
    );

    const createTabPanelItem = useCallback(
      (params: TabPanelItemParams): EuiContextMenuPanelItemDescriptor => ({
        key: params.key,
        renderItem: () => renderTabPanelItem(params),
      }),
      [renderTabPanelItem]
    );

    const buildGroupLabel = useCallback((count: number) => {
      return i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosedGroupLabel', {
        defaultMessage: '{count} tabs',
        values: { count },
      });
    }, []);

    const openedTabsPanels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
      const openedTabItems = items.map<EuiContextMenuPanelItemDescriptor>((tab) => {
        const isSelected = selectedItem?.id === tab.id;
        return createTabPanelItem({
          key: tab.id,
          tab,
          contents: getTabItemContents(tab.label, undefined, false),
          onClick: () => {
            onSelect(tab);
            closePopover();
          },
          dataTestSubj: testSubj.openedTab(tab.id),
          icon: isSelected ? 'check' : 'empty',
          ariaCurrent: isSelected ? 'true' : undefined,
        });
      });

      return [
        {
          id: OPENED_TABS_ROOT_PANEL_ID,
          items: openedTabItems,
        },
      ];
    }, [items, selectedItem, getTabItemContents, onSelect, closePopover, createTabPanelItem]);

    const recentlyClosedPanels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
      if (recentlyClosedItems.length === 0) {
        return [];
      }

      // Capture a stable "now" for relative timestamps. This prevents the UI from updating
      // the "X minutes ago" strings on re-renders (e.g. when hovering to show previews).
      // The value is refreshed only when the popover is opened.
      const referenceNow = moment(menuOpenedAt ?? Date.now());
      const groupedItems = groupRecentlyClosedItems(recentlyClosedItems);
      const rootItems: EuiContextMenuPanelItemDescriptor[] = [];
      const groupPanels: EuiContextMenuPanelDescriptor[] = [];

      for (const { closedAt, items: groupItems } of groupedItems) {
        const momentClosedAt = moment(closedAt);
        const formattedTime = momentClosedAt?.isValid() ? momentClosedAt.from(referenceNow) : '';

        if (groupItems.length === 1) {
          const tab = groupItems[0];

          rootItems.push(
            createTabPanelItem({
              key: tab.id,
              tab,
              contents: getTabItemContents(tab.label, formattedTime),
              onClick: () => {
                onSelectRecentlyClosed(tab);
                closePopover();
              },
              disabled: hasReachedMaxItemsCount,
              // Preserve existing test id for single items.
              dataTestSubj: testSubj.recentlyClosedTab(tab.id),
            })
          );
          continue;
        }

        const groupPanelId = getRecentlyClosedGroupPanelId(closedAt);
        rootItems.push({
          name: getTabItemContents(buildGroupLabel(groupItems.length), formattedTime),
          panel: groupPanelId,
          'data-test-subj': testSubj.recentlyClosedGroup(closedAt),
        });

        const groupPanelItems: EuiContextMenuPanelItemDescriptor[] = [
          {
            name: i18n.translate('unifiedTabs.tabsBarMenu.restoreAllTabs', {
              defaultMessage: 'Restore all tabs',
            }),
            key: 'restoreAllTabs',
            onClick: () => {
              onRestoreRecentlyClosedGroup(groupItems);
              closePopover();
            },
            'data-test-subj': testSubj.restoreAllTabs,
            disabled: hasReachedMaxItemsCount,
            ...getRestoreDisabledTooltipProps(hasReachedMaxItemsCount),
          },
          {
            key: 'restoreAllTabsSeparator',
            isSeparator: true,
            margin: 'none',
          },
          ...groupItems.map((tab) =>
            createTabPanelItem({
              key: tab.id,
              tab,
              contents: getTabItemContents(tab.label, undefined, false),
              onClick: () => {
                onSelectRecentlyClosed(tab);
                closePopover();
              },
              disabled: hasReachedMaxItemsCount,
              dataTestSubj: testSubj.recentlyClosedGroupTab(tab.id),
            })
          ),
        ];

        groupPanels.push({
          id: groupPanelId,
          title: i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosedGroupTitle', {
            defaultMessage: '{count} tabs',
            values: { count: groupItems.length },
          }),
          items: groupPanelItems,
        });
      }

      return [{ id: RECENTLY_CLOSED_ROOT_PANEL_ID, items: rootItems }, ...groupPanels];
    }, [
      recentlyClosedItems,
      getTabItemContents,
      buildGroupLabel,
      onSelectRecentlyClosed,
      onRestoreRecentlyClosedGroup,
      closePopover,
      hasReachedMaxItemsCount,
      menuOpenedAt,
      createTabPanelItem,
    ]);

    return (
      <EuiPopover
        data-test-subj={testSubj.tabsBarMenu}
        id={contextMenuPopoverId}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
        hasArrow={false}
        buffer={0}
        panelProps={{
          css: { overflow: 'hidden' },
          ['data-test-subj']: testSubj.tabsBarMenuPanel,
        }}
        button={
          <EuiToolTip content={menuButtonLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={menuButtonLabel}
              color="text"
              data-test-subj={testSubj.tabsBarMenuButton}
              iconType="arrowDown"
              onClick={() => {
                const isOpen = !isPopoverOpen;
                setIsPopoverOpen(isOpen);
                if (isOpen) {
                  setMenuOpenedAt(Date.now());
                }
              }}
            />
          </EuiToolTip>
        }
      >
        <div css={styles.menuContainerCss}>
          <EuiPopoverTitle paddingSize="s">
            {i18n.translate('unifiedTabs.tabsBarMenu.openedItems', {
              defaultMessage: 'Opened tabs',
            })}
          </EuiPopoverTitle>
          <div css={styles.sectionListCss}>
            <EuiContextMenu
              size="s"
              initialPanelId={OPENED_TABS_ROOT_PANEL_ID}
              panels={openedTabsPanels}
              data-test-subj={testSubj.openedTabsContextMenu}
            />
          </div>
          {recentlyClosedItems.length > 0 && (
            <>
              <EuiHorizontalRule margin="none" />
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
                      data-test-subj={testSubj.clearRecentlyClosed}
                      aria-label={i18n.translate('unifiedTabs.tabsBarMenu.clearRecentlyClosed', {
                        defaultMessage: 'Clear',
                      })}
                      onClick={onClearRecentlyClosed}
                    >
                      {i18n.translate('unifiedTabs.tabsBarMenu.clearRecentlyClosed', {
                        defaultMessage: 'Clear',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPopoverTitle>
              <div css={styles.sectionListCss}>
                <EuiContextMenu
                  css={styles.recentlyClosedContextMenuCss}
                  size="s"
                  initialPanelId={RECENTLY_CLOSED_ROOT_PANEL_ID}
                  panels={recentlyClosedPanels}
                  data-test-subj={testSubj.recentlyClosedContextMenu}
                />
              </div>
            </>
          )}
        </div>
      </EuiPopover>
    );
  }
);

const componentStyles = {
  menuContainerCss: () => css`
    width: 240px;
    max-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  sectionListCss: () => css`
    overflow-y: auto;
    min-height: 0;
    max-height: 350px;
  `,
  recentlyClosedContextMenuCss: ({ euiTheme }: UseEuiTheme) => css`
    && .euiContextMenuPanel__title.euiContextMenuItem {
      padding: ${euiTheme.size.s};
    }
  `,
};
