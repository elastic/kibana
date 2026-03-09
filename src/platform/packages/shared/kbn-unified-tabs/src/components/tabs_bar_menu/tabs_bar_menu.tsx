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
  useEuiTheme,
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
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { RecentlyClosedTabItem, TabPreviewData } from '../../types';
import type { TabItem } from '../../types';
import { TabPreview } from '../tab_preview';

const OPENED_TABS_ROOT_PANEL_ID = 'openedTabsRoot';
const RECENTLY_CLOSED_ROOT_PANEL_ID = 'recentlyClosedRoot';

export interface TabsBarMenuProps {
  items: TabItem[];
  selectedItem: TabItem | null;
  recentlyClosedItems: RecentlyClosedTabItem[];
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
    const { euiTheme } = useEuiTheme();

    const recentlyClosedContextMenuCss = useMemo(() => {
      return css`
        && .euiContextMenuPanel__title.euiContextMenuItem {
          padding: ${euiTheme.size.s};
        }
      `;
    }, [euiTheme.size.s]);

    const menuButtonLabel = i18n.translate('unifiedTabs.tabsBarMenu.tabsBarMenuButton', {
      defaultMessage: 'Tabs menu',
    });

    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
      setPreviewTabId(null);
      setMenuOpenedAt(null);
    }, [setIsPopoverOpen]);

    const getOpenedTabItemContents = useCallback((item: TabItem): React.ReactNode => {
      // title set to undefined to disable default tooltip
      return <EuiTextTruncate truncation="middle" text={item.label} title={undefined} />;
    }, []);

    const openedTabsPanels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
      const openedTabItems: EuiContextMenuPanelItemDescriptor[] = items.map((tab) => {
        const isSelected = selectedItem?.id === tab.id;
        const icon = isSelected ? 'check' : 'empty';
        const name = getOpenedTabItemContents(tab);

        const onClick = () => {
          onSelect(tab);
          closePopover();
        };

        if (getPreviewData) {
          return {
            key: tab.id,
            renderItem: () => {
              return (
                <TabPreview
                  showPreview={previewTabId === tab.id}
                  setShowPreview={() =>
                    setPreviewTabId((prev) => (prev === tab.id ? null : tab.id))
                  }
                  tabItem={{ id: tab.id, label: tab.label }}
                  previewData={getPreviewData(tab)}
                  previewDelay={0}
                  position="left"
                >
                  <EuiContextMenuItem
                    icon={icon}
                    size="s"
                    onClick={onClick}
                    data-test-subj={`unifiedTabs_tabsMenu_openedTab_${tab.id}`}
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    {name}
                  </EuiContextMenuItem>
                </TabPreview>
              );
            },
          };
        }

        return {
          key: tab.id,
          renderItem: () => (
            <EuiContextMenuItem
              icon={icon}
              size="s"
              onClick={onClick}
              data-test-subj={`unifiedTabs_tabsMenu_openedTab_${tab.id}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              {name}
            </EuiContextMenuItem>
          ),
        };
      });

      return [
        {
          id: OPENED_TABS_ROOT_PANEL_ID,
          items: openedTabItems,
        },
      ];
    }, [
      items,
      selectedItem,
      getOpenedTabItemContents,
      onSelect,
      closePopover,
      getPreviewData,
      previewTabId,
    ]);

    const getRecentlyClosedItemContents = useCallback(
      (
        item: TabItem,
        formattedTime?: string,
        options?: { includeTimeLine?: boolean }
      ): React.ReactNode => {
        const includeTimeLine = options?.includeTimeLine ?? Boolean(formattedTime);
        return (
          <>
            {/* title set to undefined to disable default tooltip */}
            <EuiTextTruncate truncation="middle" text={item.label} title={undefined} />
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

    const recentlyClosedPanels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
      if (recentlyClosedItems.length === 0) {
        return [];
      }

      // Capture a stable "now" for relative timestamps. This prevents the UI from updating
      // the "X minutes ago" strings on re-renders (e.g. when hovering to show previews).
      // The value is refreshed only when the popover is opened.
      const referenceNow = moment(menuOpenedAt ?? Date.now());

      // Group by closedAt (batch close), while preserving the incoming item order per group.
      const groups = new Map<number, RecentlyClosedTabItem[]>();
      for (const item of recentlyClosedItems) {
        const existing = groups.get(item.closedAt);
        if (existing) {
          existing.push(item);
        } else {
          groups.set(item.closedAt, [item]);
        }
      }

      const closedAtValues = Array.from(groups.keys()).sort((a, b) => b - a);
      const panels: EuiContextMenuPanelDescriptor[] = [];
      const rootItems: EuiContextMenuPanelItemDescriptor[] = [];

      for (const closedAt of closedAtValues) {
        const groupItems = groups.get(closedAt) ?? [];
        if (groupItems.length === 0) {
          continue;
        }

        const momentClosedAt = moment(closedAt);
        const formattedTime = momentClosedAt?.isValid() ? momentClosedAt.from(referenceNow) : '';

        if (groupItems.length === 1) {
          const tab = groupItems[0];
          const onClick = () => {
            onSelectRecentlyClosed(tab);
            closePopover();
          };

          const name = getRecentlyClosedItemContents(tab, formattedTime);

          if (getPreviewData) {
            rootItems.push({
              key: tab.id,
              renderItem: () => (
                <TabPreview
                  showPreview={previewTabId === tab.id}
                  setShowPreview={() =>
                    setPreviewTabId((prev) => (prev === tab.id ? null : tab.id))
                  }
                  tabItem={{ id: tab.id, label: tab.label }}
                  previewData={getPreviewData(tab)}
                  previewDelay={0}
                  position="left"
                >
                  <EuiContextMenuItem
                    size="s"
                    onClick={onClick}
                    data-test-subj={`unifiedTabs_tabsMenu_recentlyClosedTab_${tab.id}`}
                  >
                    {name}
                  </EuiContextMenuItem>
                </TabPreview>
              ),
            });
          } else {
            rootItems.push({
              name,
              onClick,
              // Preserve existing test id for single items.
              'data-test-subj': `unifiedTabs_tabsMenu_recentlyClosedTab_${tab.id}`,
            });
          }
          continue;
        }

        const groupPanelId = `recentlyClosedGroup_${closedAt}`;
        rootItems.push({
          name: (
            <>
              {/* title set to undefined to disable default tooltip */}
              <EuiTextTruncate
                truncation="middle"
                text={i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosedGroupLabel', {
                  defaultMessage: '{count} tabs',
                  values: { count: groupItems.length },
                })}
                title={undefined}
              />
              {formattedTime ? (
                <EuiText size="xs" color="subdued" className="eui-displayBlock">
                  {formattedTime}
                </EuiText>
              ) : null}
            </>
          ),
          panel: groupPanelId,
          'data-test-subj': `unifiedTabs_tabsMenu_recentlyClosedGroup_${closedAt}`,
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
            'data-test-subj': 'unifiedTabs_tabsMenu_restoreAllTabs',
          },
          {
            key: 'restoreAllTabsSeparator',
            isSeparator: true,
            margin: 'none',
          },
          ...groupItems.map<EuiContextMenuPanelItemDescriptor>((tab) => {
            const onClick = () => {
              onSelectRecentlyClosed(tab);
              closePopover();
            };

            const name = getRecentlyClosedItemContents(tab, undefined, { includeTimeLine: false });

            if (getPreviewData) {
              return {
                key: tab.id,
                renderItem: () => (
                  <TabPreview
                    showPreview={previewTabId === tab.id}
                    setShowPreview={() =>
                      setPreviewTabId((prev) => (prev === tab.id ? null : tab.id))
                    }
                    tabItem={{ id: tab.id, label: tab.label }}
                    previewData={getPreviewData(tab)}
                    previewDelay={0}
                    position="left"
                  >
                    <EuiContextMenuItem
                      size="s"
                      onClick={onClick}
                      data-test-subj={`unifiedTabs_tabsMenu_recentlyClosedGroupTab_${tab.id}`}
                    >
                      {name}
                    </EuiContextMenuItem>
                  </TabPreview>
                ),
              };
            }

            return {
              name,
              onClick,
              'data-test-subj': `unifiedTabs_tabsMenu_recentlyClosedGroupTab_${tab.id}`,
            };
          }),
        ];

        panels.push({
          id: groupPanelId,
          title: i18n.translate('unifiedTabs.tabsBarMenu.recentlyClosedGroupTitle', {
            defaultMessage: '{count} tabs',
            values: { count: groupItems.length },
          }),
          items: groupPanelItems,
        });
      }

      panels.unshift({
        id: RECENTLY_CLOSED_ROOT_PANEL_ID,
        items: rootItems,
      });

      return panels;
    }, [
      recentlyClosedItems,
      getRecentlyClosedItemContents,
      onSelectRecentlyClosed,
      onRestoreRecentlyClosedGroup,
      closePopover,
      getPreviewData,
      previewTabId,
      setPreviewTabId,
      menuOpenedAt,
    ]);

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
          css: { overflow: 'hidden' },
          ['data-test-subj']: 'unifiedTabs_tabsBarMenuPanel',
        }}
        button={
          <EuiToolTip content={menuButtonLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={menuButtonLabel}
              color="text"
              data-test-subj="unifiedTabs_tabsBarMenuButton"
              iconType="arrowDown"
              onClick={() => {
                const isOpen = !isPopoverOpen;
                setIsPopoverOpen(isOpen);
                if (isOpen) {
                  setMenuOpenedAt(Date.now());
                } else {
                  setMenuOpenedAt(null);
                }
              }}
            />
          </EuiToolTip>
        }
      >
        <div css={menuContainerCss}>
          <EuiPopoverTitle paddingSize="s">
            {i18n.translate('unifiedTabs.tabsBarMenu.openedItems', {
              defaultMessage: 'Opened tabs',
            })}
          </EuiPopoverTitle>
          <div css={sectionListCss}>
            <EuiContextMenu
              size="s"
              initialPanelId={OPENED_TABS_ROOT_PANEL_ID}
              panels={openedTabsPanels}
              data-test-subj="unifiedTabs_tabsMenu_openedTabsContextMenu"
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
                      data-test-subj="unifiedTabs_tabsMenu_clearRecentlyClosed"
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
              <div css={sectionListCss}>
                <EuiContextMenu
                  css={recentlyClosedContextMenuCss}
                  size="s"
                  initialPanelId={RECENTLY_CLOSED_ROOT_PANEL_ID}
                  panels={recentlyClosedPanels}
                  data-test-subj="unifiedTabs_tabsMenu_recentlyClosedContextMenu"
                />
              </div>
            </>
          )}
        </div>
      </EuiPopover>
    );
  }
);

const menuContainerCss = css`
  width: 240px;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const sectionListCss = css`
  overflow-y: auto;
  min-height: 0;
  max-height: 350px;
`;
