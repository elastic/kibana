/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
  keys,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { Global, css, keyframes } from '@emotion/react';
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
import {
  copyColorMapping,
  hasColorMapping,
} from '../../dashboard_actions/share_color_mapping_action';
import { coreServices } from '../../services/kibana_services';
import { ShareColorsPicker, type ShareColorsPanelPreviewOption } from './share_colors_picker';
import { capturePanelThumbnail } from './capture_panel_thumbnail';
import { describePanel, getPanelMiniChart, getPanelTitle } from './describe_panel';
import { useAddPanelsToChatAction } from './use_add_panels_to_chat_action';
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
  getShareColorMapping: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColorMapping', {
      defaultMessage: 'Share color mapping',
    }),
  getShareColorsDisabled: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.shareColorsDisabled', {
      defaultMessage: 'Select at least two charts that use a color palette',
    }),
  getUntitled: () =>
    i18n.translate('dashboard.selectedPanelsToolbar.untitled', {
      defaultMessage: 'Untitled',
    }),
  getNumberedLabel: (label: string, index: number) =>
    i18n.translate('dashboard.selectedPanelsToolbar.numberedLabel', {
      defaultMessage: '{label} ({index})',
      values: { label, index },
    }),
  getColorsApplied: (source: string, count: number) =>
    i18n.translate('dashboard.selectedPanelsToolbar.colorsApplied', {
      defaultMessage:
        'Applied colors from "{source}" to {count, plural, one {# panel} other {# panels}}',
      values: { source, count },
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

  // Share color mapping: the flyout previews each eligible source panel.
  const colorPanels: ShareColorsPanelPreviewOption[] = useMemo(() => {
    const options = Array.from(selectedPanelIds)
      .filter((id) => hasColorMapping(children[id]))
      .map((id) => {
        const title = getPanelTitle(children[id]);
        const { description, breakdown } = describePanel(children[id]);
        // every option has the same shape: a name (or "Untitled") with what it shows below
        return {
          id,
          label: title ?? strings.getUntitled(),
          isUntitled: !title,
          description,
          breakdown,
          miniChart: getPanelMiniChart(children[id]),
        };
      });
    // number options that would read exactly the same, so each can still be told apart
    return options.map((option) => {
      const same = options.filter(
        ({ label, description }) => label === option.label && description === option.description
      );
      return same.length > 1
        ? { ...option, label: strings.getNumberedLabel(option.label, same.indexOf(option) + 1) }
        : option;
    });
  }, [children, selectedPanelIds]);

  const [isPickingColorSource, setIsPickingColorSource] = useState(false);
  const [panelThumbnails, setPanelThumbnails] = useState<Record<string, string>>({});
  const thumbnailUrls = useRef<string[]>([]);
  const colorPanelPreviews = useMemo(
    () =>
      colorPanels.map((panel) => ({
        ...panel,
        thumbnailUrl: panelThumbnails[panel.id],
      })),
    [colorPanels, panelThumbnails]
  );

  useEffect(() => {
    if (!isPickingColorSource) {
      thumbnailUrls.current.forEach((url) => URL.revokeObjectURL?.(url));
      thumbnailUrls.current = [];
      setPanelThumbnails({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      colorPanels.map(async ({ id }) => {
        try {
          return [
            id,
            await capturePanelThumbnail(id, euiTheme.colors.backgroundBasePlain),
          ] as const;
        } catch {
          return [id, undefined] as const;
        }
      })
    ).then((captures) => {
      const nextThumbnails = Object.fromEntries(
        captures.filter((capture): capture is readonly [string, string] => Boolean(capture[1]))
      );
      const nextUrls = Object.values(nextThumbnails);
      if (cancelled) {
        nextUrls.forEach((url) => URL.revokeObjectURL?.(url));
        return;
      }
      thumbnailUrls.current.forEach((url) => URL.revokeObjectURL?.(url));
      thumbnailUrls.current = nextUrls;
      setPanelThumbnails(nextThumbnails);
    });

    return () => {
      cancelled = true;
    };
  }, [colorPanels, euiTheme.colors.backgroundBasePlain, isPickingColorSource]);

  useEffect(
    () => () => {
      thumbnailUrls.current.forEach((url) => URL.revokeObjectURL?.(url));
    },
    []
  );

  // Point at the panel an option refers to: the other selected panels fade back while it's
  // hovered or focused. Applied through data attributes on the grid items, see `previewStyles`.
  const setColorSourcePreview = useCallback(
    (panelId: string | undefined, fromKeyboard: boolean) => {
      for (const { id } of colorPanels) {
        const element = document.getElementById(`panel-${id}`);
        if (!element) continue;
        if (panelId && id !== panelId) element.setAttribute('data-share-colors-dimmed', 'true');
        else element.removeAttribute('data-share-colors-dimmed');
      }
      if (panelId && fromKeyboard) {
        document.getElementById(`panel-${panelId}`)?.scrollIntoView?.({
          block: 'nearest',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
    },
    [colorPanels]
  );
  const canShareColors = colorPanels.length >= 2;

  const openColorSourcePicker = useCallback(() => {
    setIsMorePopoverOpen(false);
    setIsPickingColorSource(true);
  }, []);

  const closeColorSourcePicker = useCallback(() => setIsPickingColorSource(false), []);

  const applyColorsFrom = useCallback(
    (sourcePanelId: string) => {
      const targets = colorPanels
        .filter(({ id }) => id !== sourcePanelId)
        .map(({ id }) => children[id]);
      const updated = copyColorMapping(children[sourcePanelId], targets);
      const source = colorPanels.find(({ id }) => id === sourcePanelId);
      if (updated > 0 && source) {
        coreServices.notifications.toasts.addSuccess({
          title: strings.getColorsApplied(source.label, updated),
          'data-test-subj': 'dashboardShareColorsAppliedToast',
        });
      }
      // done: back to the compact toolbar
      closeColorSourcePicker();
    },
    [children, colorPanels, closeColorSourcePicker]
  );

  // the picker has nothing to offer anymore if the selection changed under it
  useEffect(() => {
    if (isPickingColorSource && !canShareColors) closeColorSourcePicker();
  }, [isPickingColorSource, canShareColors, closeColorSourcePicker]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== keys.ESCAPE || e.defaultPrevented) return;
      // Escape backs out of the picker instead of clearing the selection
      if (isPickingColorSource) {
        closeColorSourcePicker();
        return;
      }
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
  }, [clearSelection, isPickingColorSource, closeColorSourcePicker]);

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
      {isPickingColorSource && (
        <>
          <Global styles={previewStyles} />
          <ShareColorsPicker
            panels={colorPanelPreviews}
            onApply={applyColorsFrom}
            onCancel={closeColorSourcePicker}
            onPreviewChange={setColorSourcePreview}
          />
        </>
      )}
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
              <EuiText size="s" css={styles.count} data-test-subj="dashboardSelectedPanelsCount">
                {strings.getSelectedCount(selectedPanelIds.size)}
              </EuiText>
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
                data-test-subj="dashboardSelectedPanelsToolbarDuplicate"
              />
            </EuiFlexItem>
            {canCopyToDashboard && (
              <EuiFlexItem grow={false}>
                <FloatingToolbarButton
                  label={dashboardCopyToDashboardActionStrings.getDisplayName()}
                  iconType="addToDashboard"
                  onClick={copyToDashboard}
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
                    isSelected={isMorePopoverOpen}
                    aria-expanded={isMorePopoverOpen}
                    data-test-subj="dashboardSelectedPanelsToolbarToggleMore"
                  />
                }
              >
                <EuiContextMenuPanel data-test-subj="dashboardSelectedPanelsToolbarMore">
                  <EuiContextMenuItem
                    icon="palette"
                    onClick={openColorSourcePicker}
                    disabled={!canShareColors}
                    toolTipContent={canShareColors ? undefined : strings.getShareColorsDisabled()}
                    data-test-subj="dashboardSelectedPanelsToolbarShareColors"
                  >
                    {strings.getShareColorMapping()}
                  </EuiContextMenuItem>
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
                  <EuiHorizontalRule margin="xs" />
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

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** While picking a color source, the panels not being pointed at fade back */
const previewStyles = css`
  .dshDashboardGrid__item {
    transition: opacity 150ms ${EASE_OUT};
  }
  .dshDashboardGrid__item[data-share-colors-dimmed='true'] {
    opacity: 0.35;
  }
  @media (prefers-reduced-motion: reduce) {
    .dshDashboardGrid__item {
      transition: none;
    }
  }
`;

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
    paddingRight: euiTheme.size.s,
    whiteSpace: 'nowrap' as const,
    // equal-width digits, so the label doesn't shift as the count changes
    fontVariantNumeric: 'tabular-nums',
  }),
  danger: ({ euiTheme }: UseEuiTheme) => ({
    color: euiTheme.colors.textDanger,
  }),
};
