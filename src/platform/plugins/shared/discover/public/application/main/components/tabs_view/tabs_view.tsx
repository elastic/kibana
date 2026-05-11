/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPortal,
  EuiResizeObserver,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { UnifiedTabs, type UnifiedTabsProps, type UnifiedTabsRef } from '@kbn/unified-tabs';
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import { SingleTabView, type SingleTabViewProps } from '../single_tab_view';
import {
  createTabItem,
  internalStateActions,
  selectAllTabs,
  selectRecentlyClosedTabs,
  selectIsTabsBarHidden,
  useInternalStateDispatch,
  useInternalStateSelector,
  useCurrentTabRuntimeState,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { usePreviewData } from './use_preview_data';
import { useAppMenuData } from './use_app_menu_data';

const MAX_TABS_COUNT = 25;

export const TabsView = (props: SingleTabViewProps) => {
  const services = useDiscoverServices();
  const dispatch = useInternalStateDispatch();
  const items = useInternalStateSelector(selectAllTabs);
  const recentlyClosedItems = useInternalStateSelector(selectRecentlyClosedTabs);
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const { getPreviewData } = usePreviewData(props.runtimeStateManager);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);
  const unsavedTabIds = useInternalStateSelector((state) => state.tabs.unsavedIds);
  const currentDataView = useCurrentTabRuntimeState((tab) => tab.currentDataView$);
  const scopedEbtManager = useCurrentTabRuntimeState((tab) => tab.scopedEbtManager$);

  const {
    shouldCollapseAppMenu,
    onResize,
    getTopTabMenuItems,
    getAdditionalTabMenuItems,
    topNavMenuItems,
  } = useAppMenuData({ currentDataView });

  const onEvent: UnifiedTabsProps['onEBTEvent'] = useCallback(
    (event) => {
      void scopedEbtManager.trackTabsEvent(event);
    },
    [scopedEbtManager]
  );

  const onChanged: UnifiedTabsProps['onChanged'] = useCallback(
    (updateState) => dispatch(internalStateActions.updateTabs(updateState)),
    [dispatch]
  );

  const onClearRecentlyClosed: UnifiedTabsProps['onClearRecentlyClosed'] = useCallback(
    () => dispatch(internalStateActions.clearRecentlyClosedTabs()),
    [dispatch]
  );

  const createItem: UnifiedTabsProps['createItem'] = useCallback(
    () => createTabItem(items),
    [items]
  );

  const renderContent: UnifiedTabsProps['renderContent'] = useCallback(
    () => <SingleTabView key={currentTabId} {...props} />,
    [currentTabId, props]
  );

  const unifiedTabsRef = useRef<UnifiedTabsRef | null>(null);
  const shortcuts = useMemo<LeaderKeyShortcut[]>(
    () => [
      {
        key: 'n',
        label: 'n',
        description: i18n.translate('discover.tabsView.shortcut.newTab', {
          defaultMessage: 'New',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.add();
        },
      },
      {
        key: 'x',
        label: 'x',
        description: i18n.translate('discover.tabsView.shortcut.closeCurrentTab', {
          defaultMessage: 'Close',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.closeSelected();
        },
      },
      {
        key: 'u',
        label: 'u',
        description: i18n.translate('discover.tabsView.shortcut.restoreLastClosedTab', {
          defaultMessage: 'Reopen',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.restoreLastClosed();
        },
      },
      {
        key: 'ArrowLeft',
        label: '←',
        description: i18n.translate('discover.tabsView.shortcut.previousTab', {
          defaultMessage: 'Previous',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.selectPrevious();
        },
      },
      {
        key: 'ArrowRight',
        label: '→',
        description: i18n.translate('discover.tabsView.shortcut.nextTab', {
          defaultMessage: 'Next',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.selectNext();
        },
      },
      {
        key: 'd',
        label: 'd',
        description: i18n.translate('discover.tabsView.shortcut.duplicateCurrentTab', {
          defaultMessage: 'Duplicate',
        }),
        onTrigger: () => {
          void unifiedTabsRef.current?.duplicateSelected();
        },
      },
      {
        key: 'r',
        label: 'r',
        description: i18n.translate('discover.tabsView.shortcut.renameCurrentTab', {
          defaultMessage: 'Rename',
        }),
        onTrigger: () => {
          unifiedTabsRef.current?.enterRenamingMode();
        },
      },
    ],
    []
  );

  return (
    /**
     * AppMenuComponent handles responsiveness on its own, however, there are some edge cases e.g opening push flyout
     * where this might not be good enough.
     */
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <div ref={resizeRef} className="eui-fullHeight">
          <UnifiedTabs
            ref={unifiedTabsRef}
            services={services}
            items={items}
            selectedItemId={currentTabId}
            recentlyClosedItems={recentlyClosedItems}
            unsavedItemIds={unsavedTabIds}
            maxItemsCount={MAX_TABS_COUNT}
            hideTabsBar={hideTabsBar}
            createItem={createItem}
            getPreviewData={getPreviewData}
            renderContent={renderContent}
            onChanged={onChanged}
            onEBTEvent={onEvent}
            onClearRecentlyClosed={onClearRecentlyClosed}
            getTopTabMenuItems={getTopTabMenuItems}
            getAdditionalTabMenuItems={getAdditionalTabMenuItems}
            appendRight={
              <AppMenuComponent config={topNavMenuItems} isCollapsed={shouldCollapseAppMenu} />
            }
          />
          {!hideTabsBar && (
            <LeaderKeyShortcutOverlay
              leaderKey="t"
              leaderKeyDescription={i18n.translate('discover.tabsView.shortcut.tabModeLabel', {
                defaultMessage: 'Tab',
              })}
              shortcuts={shortcuts}
            />
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};

interface LeaderKeyShortcut {
  key: string;
  label: string;
  description: string;
  onTrigger: () => void;
}

interface LeaderKeyShortcutBarProps {
  leaderKey: string;
  leaderKeyDescription: string;
  shortcuts: LeaderKeyShortcut[];
}

interface ShortcutDisplayProps {
  badgeColor?: 'primary' | 'hollow';
  badgeLabel: string;
  description: string;
}

const editableTargetSelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '.ace_editor',
  '.monaco-editor',
].join(', ');

const normalizeShortcutKey = (key: string) => key.toLowerCase();

const hasModifierKey = (event: KeyboardEvent) => {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    (target instanceof HTMLElement && target.isContentEditable) ||
    Boolean(target.closest(editableTargetSelector))
  );
};

const consumeKeyboardEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const getScreenReaderShortcutKeyLabel = (key: string) => {
  switch (key) {
    case 'ArrowLeft':
      return i18n.translate('discover.tabsView.shortcut.screenReaderArrowLeftLabel', {
        defaultMessage: 'left arrow',
      });
    case 'ArrowRight':
      return i18n.translate('discover.tabsView.shortcut.screenReaderArrowRightLabel', {
        defaultMessage: 'right arrow',
      });
    default:
      return key.toLowerCase();
  }
};

const getScreenReaderShortcutDescription = ({
  key,
  description,
}: Pick<LeaderKeyShortcut, 'key' | 'description'>) => {
  return i18n.translate('discover.tabsView.shortcut.screenReaderShortcutDescription', {
    defaultMessage: '{key} for {description}',
    values: {
      key: getScreenReaderShortcutKeyLabel(key),
      description,
    },
  });
};

const LeaderKeyDivider = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        width: ${euiTheme.border.width.thin};
        align-self: stretch;
        background-color: ${euiTheme.colors.borderBasePlain};
      `}
    />
  );
};

const ShortcutDisplay = ({
  badgeColor = 'hollow',
  badgeLabel,
  description,
}: ShortcutDisplayProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
      <EuiBadge color={badgeColor}>{badgeLabel}</EuiBadge>
      <EuiText
        size="xs"
        css={css`
          white-space: nowrap;
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {description}
      </EuiText>
    </EuiFlexGroup>
  );
};

const LeaderKeyShortcutOverlay = ({
  leaderKey,
  leaderKeyDescription,
  shortcuts,
}: LeaderKeyShortcutBarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { euiTheme } = useEuiTheme();
  const normalizedLeaderKey = normalizeShortcutKey(leaderKey);
  const shortcutsByKey = useMemo(
    () => new Map(shortcuts.map((shortcut) => [normalizeShortcutKey(shortcut.key), shortcut])),
    [shortcuts]
  );
  const screenReaderHint = useMemo(() => {
    return i18n.translate('discover.tabsView.shortcut.screenReaderHint', {
      defaultMessage: 'Press {leaderKey} for {leaderKeyDescription} shortcuts.',
      values: {
        leaderKeyDescription,
        leaderKey: leaderKey.toUpperCase(),
      },
    });
  }, [leaderKey, leaderKeyDescription]);
  const screenReaderAnnouncement = useMemo(() => {
    return i18n.translate('discover.tabsView.shortcut.screenReaderAnnouncement', {
      defaultMessage:
        '{leaderKeyDescription} shortcuts available. {shortcutDescriptions}. Press Escape to exit.',
      values: {
        leaderKeyDescription,
        shortcutDescriptions: shortcuts
          .map((shortcut) => getScreenReaderShortcutDescription(shortcut))
          .join(', '),
      },
    });
  }, [leaderKeyDescription, shortcuts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) {
        if (
          normalizeShortcutKey(event.key) === normalizedLeaderKey &&
          !hasModifierKey(event) &&
          !isEditableTarget(event.target)
        ) {
          consumeKeyboardEvent(event);
          setIsVisible(true);
        }

        return;
      }

      if (hasModifierKey(event) || isEditableTarget(event.target)) {
        setIsVisible(false);
        return;
      }

      consumeKeyboardEvent(event);

      if (event.key === 'Escape') {
        setIsVisible(false);
        return;
      }

      const shortcut = shortcutsByKey.get(normalizeShortcutKey(event.key));
      shortcut?.onTrigger();
      setIsVisible(false);
    };

    const onPointerDown = () => {
      if (isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [isVisible, normalizedLeaderKey, shortcutsByKey]);

  if (!isVisible) {
    return (
      <EuiScreenReaderOnly>
        <p>{screenReaderHint}</p>
      </EuiScreenReaderOnly>
    );
  }

  return (
    <>
      <EuiScreenReaderOnly>
        <p role="status" aria-live="polite" aria-atomic="true">
          {screenReaderAnnouncement}
        </p>
      </EuiScreenReaderOnly>

      <EuiPortal>
        <EuiPanel
          aria-hidden="true"
          paddingSize="m"
          css={css`
            position: fixed;
            right: ${euiTheme.size.l};
            bottom: ${euiTheme.size.l};
            z-index: ${euiTheme.levels.toast};
            pointer-events: none;
            max-width: calc(100vw - ${euiTheme.size.l} * 2);
          `}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <ShortcutDisplay
                badgeColor="primary"
                badgeLabel={leaderKey.toUpperCase()}
                description={leaderKeyDescription}
              />
            </EuiFlexItem>

            <LeaderKeyDivider />

            {shortcuts.map((shortcut) => (
              <EuiFlexItem grow={false} key={shortcut.key}>
                <ShortcutDisplay badgeLabel={shortcut.label} description={shortcut.description} />
              </EuiFlexItem>
            ))}

            <LeaderKeyDivider />

            <EuiBadge>
              {i18n.translate('discover.tabsView.shortcut.escapeLabel', {
                defaultMessage: 'esc',
              })}
            </EuiBadge>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPortal>
    </>
  );
};
