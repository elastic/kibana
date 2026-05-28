/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { useReactFlow, useStore } from '@xyflow/react';
import React, { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';

export type WorkflowDetailBottomBarView = 'yaml' | 'graph';

export interface ToolMenuItemDef {
  iconType: string;
  label: string;
  onClick?: () => void;
  href?: string;
  target?: string;
}

export interface WorkflowDetailBottomBarProps {
  editorView: WorkflowDetailBottomBarView;
  onEditorViewChange: (next: WorkflowDetailBottomBarView) => void;
  toolsSlot?: ReactNode;
  /** Structured list of tool actions rendered as a named list inside the compact ⋮ popover. */
  toolsMenuItems?: ToolMenuItemDef[];
  testWorkflowButton?: ReactNode;
  /** Icon-only variant of testWorkflowButton shown in compact mode. Falls back to testWorkflowButton if not provided. */
  testWorkflowButtonCompact?: ReactNode;
  /**
   * Extra space (in px) to add to the bar's `bottom` offset. Useful when an
   * expandable panel below (e.g. validation errors) would otherwise overlap
   * the bar.
   */
  bottomOffset?: number;
}

// Figma Shadow/Medium composite.
const BAR_SHADOW =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 4px 8px 0 rgba(43, 57, 79, 0.12), 0 8px 16px 0 rgba(43, 57, 79, 0.06)';

// Subtle shadow for the active view-toggle button (Figma Shadow/X-small).
const TOGGLE_ACTIVE_SHADOW =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 1px 4px 0 rgba(43, 57, 79, 0.06), 0 2px 8px 0 rgba(43, 57, 79, 0.05)';

// Width (px) of the bar's position: relative container below which we switch
// to the compact "…" pill. Chosen to give the full bar enough room before it
// starts overlapping the minimap (bottom-left of the canvas).
const COMPACT_THRESHOLD_PX = 800;

// Treat any zoom within this tolerance of 1.0 as "default".
const ZOOM_RESET_EPS = 0.01;

function ZoomControls() {
  const zoomOutLabel = i18n.translate('workflowsUi.bottomBar.zoomOut', {
    defaultMessage: 'Zoom out',
  });
  const zoomInLabel = i18n.translate('workflowsUi.bottomBar.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const zoomResetLabel = i18n.translate('workflowsUi.bottomBar.zoomReset', {
    defaultMessage: 'Reset zoom',
  });

  const { zoomIn, zoomOut, setViewport, getViewport } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const isZoomed = Math.abs(zoom - 1) > ZOOM_RESET_EPS;

  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);
  const handleZoomReset = useCallback(() => {
    const { x, y } = getViewport();
    setViewport({ x, y, zoom: 1 }, { duration: 200 });
  }, [getViewport, setViewport]);

  return (
    <>
      <EuiFlexItem
        grow={false}
        css={{
          display: 'flex',
          overflow: 'hidden',
          maxWidth: isZoomed ? 40 : 0,
          opacity: isZoomed ? 1 : 0,
          transform: isZoomed ? 'translateX(0)' : 'translateX(-4px)',
          pointerEvents: isZoomed ? 'auto' : 'none',
          transition:
            'max-width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 160ms ease, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <EuiToolTip content={zoomResetLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="bullseye"
            aria-label={zoomResetLabel}
            color="text"
            size="s"
            onClick={handleZoomReset}
            isDisabled={!isZoomed}
            data-test-subj="workflowBottomBar-zoom-reset"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="plusInCircle"
          aria-label={zoomInLabel}
          color="text"
          size="s"
          onClick={handleZoomIn}
          data-test-subj="workflowBottomBar-zoom-in"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="minusInCircle"
          aria-label={zoomOutLabel}
          color="text"
          size="s"
          onClick={handleZoomOut}
          data-test-subj="workflowBottomBar-zoom-out"
        />
      </EuiFlexItem>
    </>
  );
}

function ViewToggle({
  editorView,
  onEditorViewChange,
}: {
  editorView: WorkflowDetailBottomBarView;
  onEditorViewChange: (next: WorkflowDetailBottomBarView) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const items: Array<{ id: WorkflowDetailBottomBarView; iconType: string; label: string }> = [
    {
      id: 'graph',
      iconType: 'workflow',
      label: i18n.translate('workflowsUi.bottomBar.editorViewGraph', { defaultMessage: 'Graph' }),
    },
    {
      id: 'yaml',
      iconType: 'editorCodeBlock',
      label: i18n.translate('workflowsUi.bottomBar.editorViewYaml', { defaultMessage: 'YAML' }),
    },
  ];

  return (
    <div
      role="group"
      aria-label={i18n.translate('workflowsUi.bottomBar.editorViewLegend', {
        defaultMessage: 'Editor view',
      })}
      css={{
        background: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: 6,
        padding: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {items.map(({ id, iconType, label }) => {
        const active = id === editorView;
        return (
          <EuiToolTip key={id} content={label} disableScreenReaderOutput>
            <button
              type="button"
              aria-label={label}
              aria-pressed={active}
              onClick={() => onEditorViewChange(id)}
              data-test-subj={`workflowEditorViewToggle-${id}`}
              css={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
                padding: 0,
                background: active ? euiTheme.colors.backgroundBasePlain : 'transparent',
                boxShadow: active ? TOGGLE_ACTIVE_SHADOW : 'none',
                color: euiTheme.colors.text,
                transition: 'background 120ms ease, box-shadow 120ms ease',
                '&:hover': {
                  background: active
                    ? euiTheme.colors.backgroundBasePlain
                    : euiTheme.colors.backgroundBaseInteractiveHover,
                },
                '&:focus-visible': {
                  outline: `2px solid ${euiTheme.colors.primary}`,
                  outlineOffset: 2,
                },
              }}
            >
              <EuiIcon
                type={iconType}
                aria-hidden
                color={active ? euiTheme.colors.primaryText : euiTheme.colors.text}
              />
            </button>
          </EuiToolTip>
        );
      })}
    </div>
  );
}

function CompactToolsMenu({
  toolsMenuItems,
  toolsSlot,
}: {
  toolsMenuItems?: ToolMenuItemDef[];
  toolsSlot?: ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  if ((!toolsMenuItems || toolsMenuItems.length === 0) && !toolsSlot) {
    return null;
  }

  const label = i18n.translate('workflowsUi.bottomBar.toolsMenu', {
    defaultMessage: 'Tools',
  });

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={close}
      anchorPosition="upCenter"
      panelPaddingSize="s"
      aria-label={label}
      button={
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
            aria-label={label}
            color="text"
            size="s"
            onClick={() => setIsOpen((v) => !v)}
            data-test-subj="workflowBottomBarToolsMenu"
          />
        </EuiToolTip>
      }
    >
      <div css={{ minWidth: 240 }}>
        {toolsSlot}
        {toolsMenuItems?.length ? (
          <div css={{ marginTop: toolsSlot ? euiTheme.size.s : 0 }}>
            {toolsMenuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  close();
                }}
                css={{
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  background: 'transparent',
                  padding: `${euiTheme.size.s} ${euiTheme.size.s}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: euiTheme.size.s,
                  alignItems: 'center',
                  '&:hover': { background: euiTheme.colors.backgroundBaseInteractiveHover },
                  '&:focus-visible': {
                    outline: `2px solid ${euiTheme.colors.primary}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <EuiIcon type={item.iconType} aria-hidden />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </EuiPopover>
  );
}

function VerticalDivider({ fullHeight = false }: { fullHeight?: boolean }) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden
      css={{
        width: 1,
        height: fullHeight ? '100%' : 32,
        background: euiTheme.colors.borderBaseSubdued,
        marginInline: euiTheme.size.s,
      }}
    />
  );
}

export function WorkflowDetailBottomBar({
  editorView,
  onEditorViewChange,
  toolsSlot,
  toolsMenuItems,
  testWorkflowButton,
  testWorkflowButtonCompact,
  bottomOffset = 0,
}: WorkflowDetailBottomBarProps) {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setCompact(w < COMPACT_THRESHOLD_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [isExpanded, setIsExpanded] = useState(true);
  const isInitialPhaseRef = useRef(true);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialPhaseRef.current = false;
      setIsExpanded(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  const handleExpandedMouseEnter = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
  }, []);

  const handleExpandedMouseLeave = useCallback(() => {
    if (!isInitialPhaseRef.current) {
      collapseTimerRef.current = setTimeout(() => setIsExpanded(false), 600);
    }
  }, []);

  const handlePillMouseEnter = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    setIsExpanded(true);
  }, []);

  const barCss: CSSObject = {
    position: 'absolute',
    left: -2,
    right: -2,
    bottom: 24 + bottomOffset,
    zIndex: euiTheme.levels.header,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  const pillLabel = i18n.translate('workflowsUi.bottomBar.expandControls', {
    defaultMessage: 'Show toolbar',
  });

  return (
    <div ref={containerRef} css={barCss} data-test-subj="workflowDetailBottomBar">
      <div
        css={{
          pointerEvents: isExpanded ? 'auto' : 'none',
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 200ms ease',
          background: euiTheme.colors.backgroundBasePlain,
          border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          borderRadius: 12,
          padding: euiTheme.size.s,
          boxShadow: BAR_SHADOW,
          display: 'inline-flex',
          maxWidth: 'min(980px, 100%)',
        }}
        onMouseEnter={handleExpandedMouseEnter}
        onMouseLeave={handleExpandedMouseLeave}
      >
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap={false}>
          {editorView === 'graph' && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center" wrap={false}>
                  <ZoomControls />
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <VerticalDivider />
              </EuiFlexItem>
            </>
          )}

          {compact ? (
            <EuiFlexItem grow={false}>
              <CompactToolsMenu toolsMenuItems={toolsMenuItems} toolsSlot={toolsSlot} />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>{toolsSlot}</EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <VerticalDivider />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <ViewToggle editorView={editorView} onEditorViewChange={onEditorViewChange} />
          </EuiFlexItem>

          {testWorkflowButton ? (
            <EuiFlexItem grow={false} css={{ alignSelf: 'stretch', display: 'flex', alignItems: 'stretch' }}>
              <VerticalDivider fullHeight />
            </EuiFlexItem>
          ) : null}

          {testWorkflowButton ? (
            <EuiFlexItem grow={false}>
              {compact ? testWorkflowButtonCompact ?? testWorkflowButton : testWorkflowButton}
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </div>

      {/* Collapsed pill — hover to expand */}
      <div
        role="button"
        tabIndex={0}
        aria-label={pillLabel}
        css={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          pointerEvents: isExpanded ? 'none' : 'auto',
          opacity: isExpanded ? 0 : 1,
          transition: 'opacity 200ms ease',
          width: 64,
          height: 24,
          background: euiTheme.colors.primary,
          borderRadius: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: BAR_SHADOW,
          cursor: 'pointer',
        }}
        onMouseEnter={handlePillMouseEnter}
        onFocus={handlePillMouseEnter}
        onBlur={handleExpandedMouseLeave}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePillMouseEnter();
          }
        }}
      >
        <EuiIcon type="boxesVertical" size="s" color={euiTheme.colors.emptyShade} css={{ transform: 'rotate(90deg)' }} aria-hidden />
      </div>
    </div>
  );
}
