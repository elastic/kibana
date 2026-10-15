/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  keys,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { AiButton } from '@kbn/ui-ai-components';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import type { SelectedPanelsLayoutMode } from '../../dashboard_api/layout_manager/apply_selected_panels_layout';
import {
  dashboardClonePanelActionStrings,
  dashboardCopyToDashboardActionStrings,
  dashboardPanelContextMenuStrings,
} from '../../dashboard_actions/_dashboard_actions_strings';
import { useBulkPanelActions } from '../grid/use_bulk_panel_actions';
import { useAddPanelsToChatAction } from './use_add_panels_to_chat_action';
import { KeyboardShortcutsPopover } from './keyboard_shortcuts_popover';
import {
  EASE_OUT,
  FloatingToolbar,
  FloatingToolbarButton,
  floatingToolbarStyles,
} from '../floating_toolbar/floating_toolbar';
import {
  getAnnotationsVisibility,
  setAnnotationsHidden,
  type AnnotationsVisibility,
} from './panel_annotations';

const strings = {
  getSelectedCount: (count: number) =>
    i18n.translate('dashboard.selectedPanelsToolbar.selectedCount', {
      defaultMessage: '{count} selected',
      values: { count },
    }),
  getClearSelection: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.clearSelection', {
      defaultMessage: 'Clear selection',
    }),
  getAddToChat: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.addToChat', {
      defaultMessage: 'Add to chat',
    }),
  getGroupIntoSection: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.groupIntoSection', {
      defaultMessage: 'Group into section',
    }),
  getGroupDisabled: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.groupDisabled', {
      defaultMessage: 'Select at least two panels to group them',
    }),
  getToolbarLabel: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.ariaLabel', {
      defaultMessage: 'Selected panels actions',
    }),
  getHideAnnotations: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.hideAnnotations', {
      defaultMessage: 'Hide annotations',
    }),
  getShowAnnotations: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.showAnnotations', {
      defaultMessage: 'Show annotations',
    }),
  getDeletePanels: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.deletePanels', {
      defaultMessage: 'Delete panels',
    }),
  getMoreOptions: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.moreOptions', {
      defaultMessage: 'More options',
    }),
};

/** The layout button is hidden for now in favor of the keyboard shortcuts button */
const SHOW_LAYOUT_BUTTON = false;

/** How long the toolbar waits for the "Add to chat" availability check before showing anyway */
const READY_TIMEOUT = 250;

export interface SelectedPanelsToolbarProps {
  selectedPanelIds: Set<string>;
  /** skips the entrance, e.g. when the toolbar was visible a moment ago */
  skipEntrance?: boolean;
}

export const SelectedPanelsToolbar = ({
  selectedPanelIds,
  skipEntrance = false,
}: SelectedPanelsToolbarProps) => {
  const dashboardApi = useDashboardApi();
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(toolbarStyles);
  const shared = useMemoCss(floatingToolbarStyles);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isMorePopoverOpen, setIsMorePopoverOpen] = useState(false);
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);

  const { duplicate, remove, group, canGroup, applyLayout, copyToDashboard, canCopyToDashboard } =
    useBulkPanelActions(selectedPanelIds);
  const { addToChat, isResolved } = useAddPanelsToChatAction(dashboardApi, selectedPanelIds);

  // Hold the entrance until we know whether "Add to chat" is available, so the row is complete on
  // its first frame instead of shifting right after the toolbar appears.
  const [hasTimedOut, setHasTimedOut] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setHasTimedOut(true), READY_TIMEOUT);
    return () => clearTimeout(timeout);
  }, []);
  const isReady = isResolved || hasTimedOut;
  // if the check only resolves after the toolbar is shown, ease the button in
  const hadAddToChatWhenReady = useRef<boolean | null>(null);
  if (isReady && hadAddToChatWhenReady.current === null) {
    hadAddToChatWhenReady.current = Boolean(addToChat);
  }
  const isAddToChatLate = hadAddToChatWhenReady.current === false;
  // in select mode the toolbar shows before any panel is selected, with nothing to act on yet
  const hasSelection = selectedPanelIds.size > 0;

  const children = useStateFromPublishingSubject(dashboardApi.children$);
  const [annotationsVisibility, setAnnotationsVisibility] = useState<AnnotationsVisibility>(() =>
    getAnnotationsVisibility(children, selectedPanelIds)
  );
  useEffect(() => {
    setAnnotationsVisibility(getAnnotationsVisibility(children, selectedPanelIds));
  }, [children, selectedPanelIds]);

  const toggleAnnotations = useCallback(() => {
    const hide = annotationsVisibility === 'visible';
    setAnnotationsHidden(children, selectedPanelIds, hide);
    // flip the option right away, without waiting for the panels to re-render
    setAnnotationsVisibility(hide ? 'hidden' : 'visible');
  }, [annotationsVisibility, children, selectedPanelIds]);

  const clearSelection = useCallback(
    () => dashboardApi.setSelectedPanelIds(new Set()),
    [dashboardApi]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== keys.ESCAPE || e.defaultPrevented) return;
      // let Escape close popovers, modals, flyouts and leave text fields alone
      const active = document.activeElement as HTMLElement | null;
      if (
        active?.closest(
          'input, textarea, [contenteditable="true"], [role="dialog"], .euiPopover__panel'
        )
      ) {
        return;
      }
      clearSelection();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearSelection]);

  const handleLayout = useCallback(
    (mode: SelectedPanelsLayoutMode) => {
      applyLayout(mode);
      setIsLayoutPopoverOpen(false);
    },
    [applyLayout]
  );

  const layoutLabel = dashboardPanelContextMenuStrings.getLayoutLabel();

  return (
    <>
      <FloatingToolbar
        frameRef={frameRef}
        isReady={isReady}
        skipEntrance={skipEntrance}
        role="toolbar"
        aria-label={strings.getToolbarLabel()}
        data-test-subj="dashboardSelectedPanelsToolbar"
      >
        <div css={shared.content}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <FloatingToolbarButton
                label={strings.getClearSelection()}
                iconType="cross"
                onClick={clearSelection}
                data-test-subj="dashboardSelectedPanelsToolbarClear"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="primary"
                css={styles.count}
                data-test-subj="dashboardSelectedPanelsCount"
              >
                {strings.getSelectedCount(selectedPanelIds.size)}
              </EuiBadge>
            </EuiFlexItem>
            <div css={shared.separator} aria-hidden />
            {addToChat && (
              <EuiFlexItem grow={false} css={isAddToChatLate ? styles.lateButton : undefined}>
                <AiButton
                  iconOnly
                  variant="empty"
                  size="s"
                  iconType="addToChat"
                  aria-label={strings.getAddToChat()}
                  withToolTip
                  isDisabled={!hasSelection}
                  onClick={() => addToChat.execute()}
                  data-test-subj="dashboardSelectedPanelsToolbarAddToChat"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <FloatingToolbarButton
                label={dashboardClonePanelActionStrings.getDisplayName()}
                iconType="copy"
                onClick={duplicate}
                isDisabled={!hasSelection}
                data-test-subj="dashboardSelectedPanelsToolbarDuplicate"
              />
            </EuiFlexItem>
            {canCopyToDashboard && (
              <EuiFlexItem grow={false}>
                <FloatingToolbarButton
                  label={dashboardCopyToDashboardActionStrings.getDisplayName()}
                  iconType="addToDashboard"
                  onClick={copyToDashboard}
                  isDisabled={!hasSelection}
                  data-test-subj="dashboardSelectedPanelsToolbarCopyToDashboard"
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <FloatingToolbarButton
                label={strings.getGroupIntoSection()}
                tooltip={canGroup ? undefined : strings.getGroupDisabled()}
                iconType="section"
                onClick={group}
                isDisabled={!canGroup}
                data-test-subj="dashboardSelectedPanelsToolbarGroup"
              />
            </EuiFlexItem>
            {SHOW_LAYOUT_BUTTON && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  isOpen={isLayoutPopoverOpen}
                  closePopover={() => setIsLayoutPopoverOpen(false)}
                  anchorPosition="upCenter"
                  panelPaddingSize="none"
                  aria-label={layoutLabel}
                  button={
                    <FloatingToolbarButton
                      label={layoutLabel}
                      iconType="grid"
                      onClick={() => setIsLayoutPopoverOpen((open) => !open)}
                      isSelected={isLayoutPopoverOpen}
                      data-test-subj="dashboardSelectedPanelsToolbarLayout"
                    />
                  }
                >
                  <EuiContextMenuPanel
                    items={[
                      <EuiContextMenuItem
                        key="header"
                        icon="alignTop"
                        onClick={() => handleLayout('header')}
                        data-test-subj="dashboardSelectedPanelsToolbarLayoutHeader"
                      >
                        {dashboardPanelContextMenuStrings.getLayoutHeaderLabel()}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="grid"
                        icon="grid"
                        onClick={() => handleLayout('grid')}
                        data-test-subj="dashboardSelectedPanelsToolbarLayoutGrid"
                      >
                        {dashboardPanelContextMenuStrings.getLayoutGridLabel()}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="side"
                        icon="alignRight"
                        onClick={() => handleLayout('side')}
                        data-test-subj="dashboardSelectedPanelsToolbarLayoutSide"
                      >
                        {dashboardPanelContextMenuStrings.getLayoutSideLabel()}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <KeyboardShortcutsPopover />
            </EuiFlexItem>
            <div css={shared.separator} aria-hidden />
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isMorePopoverOpen}
                closePopover={() => setIsMorePopoverOpen(false)}
                anchorPosition="upRight"
                panelPaddingSize="none"
                hasArrow={false}
                offset={Number.parseFloat(euiTheme.size.m)}
                panelProps={{ css: styles.morePopover }}
                aria-label={strings.getMoreOptions()}
                button={
                  <FloatingToolbarButton
                    label={strings.getMoreOptions()}
                    iconType="boxesVertical"
                    onClick={() => setIsMorePopoverOpen((open) => !open)}
                    isDisabled={!hasSelection}
                    isSelected={isMorePopoverOpen}
                    aria-expanded={isMorePopoverOpen}
                    data-test-subj="dashboardSelectedPanelsToolbarToggleMore"
                  />
                }
              >
                <EuiContextMenuPanel data-test-subj="dashboardSelectedPanelsToolbarMore">
                  {annotationsVisibility !== 'none' && (
                    <EuiContextMenuItem
                      icon="flag"
                      onClick={() => {
                        toggleAnnotations();
                        setIsMorePopoverOpen(false);
                      }}
                      data-test-subj="dashboardSelectedPanelsToolbarToggleAnnotations"
                    >
                      {annotationsVisibility === 'visible'
                        ? strings.getHideAnnotations()
                        : strings.getShowAnnotations()}
                    </EuiContextMenuItem>
                  )}
                  {annotationsVisibility !== 'none' && <EuiHorizontalRule margin="xs" />}
                  <EuiContextMenuItem
                    icon={<EuiIcon type="trash" color="danger" aria-hidden />}
                    onClick={() => {
                      setIsMorePopoverOpen(false);
                      remove();
                    }}
                    css={styles.danger}
                    data-test-subj="dashboardSelectedPanelsToolbarRemove"
                  >
                    {strings.getDeletePanels()}
                  </EuiContextMenuItem>
                </EuiContextMenuPanel>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </FloatingToolbar>
    </>
  );
};

const popIn = keyframes({
  from: { opacity: 0, scale: '0.9' },
  to: { opacity: 1, scale: '1' },
});

const toolbarStyles = {
  morePopover: ({ euiTheme }: UseEuiTheme) => ({
    minWidth: 240,
    paddingBlock: euiTheme.size.xs,
  }),
  lateButton: {
    animation: `${popIn} 150ms ${EASE_OUT}`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  },
  count: ({ euiTheme }: UseEuiTheme) => ({
    marginRight: euiTheme.size.s,
    // equal-width digits, so the badge doesn't change width as the count changes
    fontVariantNumeric: 'tabular-nums',
  }),
  danger: ({ euiTheme }: UseEuiTheme) => ({
    color: euiTheme.colors.textDanger,
  }),
};
