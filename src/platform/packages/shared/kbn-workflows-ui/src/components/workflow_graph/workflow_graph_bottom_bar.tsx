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
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { i18n } from '@kbn/i18n';

export type WorkflowDetailBottomBarView = 'yaml' | 'graph';

/**
 * Published by `WorkflowDetailBottomBar` so any popovers anchored to its
 * buttons (e.g. keyboard shortcuts, editor settings) can close themselves
 * when the bar auto-collapses to the small pill — otherwise the popover
 * stays floating on the canvas with no visible anchor.
 */
interface WorkflowBottomBarContextValue {
  isExpanded: boolean;
}
const WorkflowBottomBarContext = createContext<WorkflowBottomBarContextValue>({ isExpanded: true });

export function useWorkflowBottomBarState(): WorkflowBottomBarContextValue {
  return useContext(WorkflowBottomBarContext);
}

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
  /**
   * Leftmost slot shown only in YAML view (e.g. "add step" + documentation).
   * Mirrors ZoomControls in graph view.
   */
  yamlActionsSlot?: ReactNode;
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
  /**
   * When true, the bar stays expanded indefinitely — the 5s post-mount
   * auto-collapse and the 600ms mouseLeave collapse are both skipped. The
   * collapsed pill is hidden as well. Wired up to the "Hide controls menu"
   * setting in the settings popover.
   */
  disableAutoCollapse?: boolean;
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

function ZoomControls() {
  const zoomOutLabel = i18n.translate('workflowsUi.bottomBar.zoomOut', {
    defaultMessage: 'Zoom out',
  });
  const zoomInLabel = i18n.translate('workflowsUi.bottomBar.zoomIn', {
    defaultMessage: 'Zoom in',
  });

  const { zoomIn, zoomOut } = useReactFlow();
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={zoomInLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="plusInCircle"
            aria-label={zoomInLabel}
            color="text"
            size="s"
            onClick={handleZoomIn}
            data-test-subj="workflowBottomBar-zoom-in"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={zoomOutLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minusInCircle"
            aria-label={zoomOutLabel}
            color="text"
            size="s"
            onClick={handleZoomOut}
            data-test-subj="workflowBottomBar-zoom-out"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </>
  );
}

// Treat any zoom within this tolerance of 1.0 as "default" (not zoomed).
const ZOOM_RESET_EPS = 0.01;

// Visual width of the pill, of which 12px tucks behind the bar via z-index.
const ZOOM_RESET_PILL_WIDTH = 64;
const ZOOM_RESET_PILL_OVERLAP = 12;

/**
 * Yellow bullseye pill that slides out from under the left edge of the bar
 * whenever the graph is zoomed. Click to reset to zoom = 1. Sits at a lower
 * z-index than the bar so its right edge tucks under (and is hidden by) the
 * bar's solid background.
 */
function ZoomResetPill({
  editorView,
  isExpanded,
  onMouseEnter,
  onMouseLeave,
}: {
  editorView: WorkflowDetailBottomBarView;
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const zoom = useStore((s) => s.transform[2]);
  const isZoomed = Math.abs(zoom - 1) > ZOOM_RESET_EPS;
  const { setViewport, getViewport } = useReactFlow();

  const handleReset = useCallback(() => {
    const { x, y } = getViewport();
    setViewport({ x, y, zoom: 1 }, { duration: 200 });
  }, [getViewport, setViewport]);

  const show = editorView === 'graph' && isZoomed && isExpanded;
  const label = i18n.translate('workflowsUi.bottomBar.zoomReset', {
    defaultMessage: 'Reset zoom',
  });

  return (
    <div
      role="button"
      tabIndex={show ? 0 : -1}
      aria-label={label}
      title={label}
      data-test-subj="workflowBottomBar-zoom-reset"
      onClick={handleReset}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleReset();
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden={!show}
      css={{
        position: 'absolute',
        right: '100%',
        top: 0,
        bottom: 0,
        width: ZOOM_RESET_PILL_WIDTH,
        transform: show
          ? `translateX(${ZOOM_RESET_PILL_OVERLAP}px)`
          : `translateX(${ZOOM_RESET_PILL_WIDTH}px)`,
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
        transition:
          'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease, filter 120ms ease',
        zIndex: 0,
        background: '#fde9b5',
        // Only the left side is rounded; the right side stays square and tucks
        // under the bar (Figma rectangleCornerRadii [10, 0, 0, 10]).
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        boxShadow: BAR_SHADOW,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        // Centers the 16px icon within the visible 52px portion of the pill
        // (visible = ZOOM_RESET_PILL_WIDTH - ZOOM_RESET_PILL_OVERLAP = 52,
        //  (52 - 16) / 2 = 18).
        paddingLeft: 18,
        cursor: 'pointer',
        '&:hover': { filter: 'brightness(0.97)' },
        '&:focus-visible': {
          outline: `2px solid ${euiTheme.colors.primary}`,
          outlineOffset: 2,
        },
      }}
    >
      <EuiIcon type="bullseye" size="m" color="#1d2a3e" aria-hidden />
    </div>
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

function VerticalDivider({
  fullHeight = false,
  fullBar = false,
}: {
  fullHeight?: boolean;
  /**
   * When true, the divider extends through the bar's vertical padding
   * (using a negative block margin), reaching the inside of the bar's
   * border. Inline margin is dropped so neighbours space themselves via
   * the parent's flex `gap` instead.
   */
  fullBar?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden
      css={{
        width: 1,
        height: fullBar ? `calc(100% + ${euiTheme.size.s} * 2)` : fullHeight ? '100%' : 32,
        marginBlock: fullBar ? `-${euiTheme.size.s}` : 0,
        marginInline: fullBar ? 0 : euiTheme.size.s,
        background: euiTheme.colors.borderBaseSubdued,
      }}
    />
  );
}

export function WorkflowDetailBottomBar({
  editorView,
  onEditorViewChange,
  yamlActionsSlot,
  toolsSlot,
  toolsMenuItems,
  testWorkflowButton,
  testWorkflowButtonCompact,
  bottomOffset = 0,
  disableAutoCollapse = false,
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
    if (disableAutoCollapse) return undefined;
    const timer = setTimeout(() => {
      isInitialPhaseRef.current = false;
      setIsExpanded(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [disableAutoCollapse]);

  // If the user flips the "Hide controls menu" setting OFF while the bar is
  // collapsed, snap it back to expanded immediately and cancel any pending
  // collapse timer.
  useEffect(() => {
    if (disableAutoCollapse) {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      setIsExpanded(true);
    }
  }, [disableAutoCollapse]);

  const handleExpandedMouseEnter = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
  }, []);

  const handleExpandedMouseLeave = useCallback(() => {
    if (disableAutoCollapse) return;
    if (!isInitialPhaseRef.current) {
      collapseTimerRef.current = setTimeout(() => setIsExpanded(false), 600);
    }
  }, [disableAutoCollapse]);

  const handlePillMouseEnter = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    setIsExpanded(true);
  }, []);

  const barCss: CSSObject = {
    position: 'absolute',
    left: -2,
    right: -2,
    bottom: 12 + bottomOffset,
    zIndex: euiTheme.levels.header,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  const pillLabel = i18n.translate('workflowsUi.bottomBar.expandControls', {
    defaultMessage: 'Show toolbar',
  });

  return (
    <WorkflowBottomBarContext.Provider value={{ isExpanded }}>
      <div ref={containerRef} css={barCss} data-test-subj="workflowDetailBottomBar">
        {/* Wrapper provides the positioning context the ZoomResetPill anchors to
            (right: 100% of this wrapper = left edge of the inner bar). */}
        <div css={{ position: 'relative', pointerEvents: 'none' }}>
        <ZoomResetPill
          editorView={editorView}
          isExpanded={isExpanded}
          onMouseEnter={handleExpandedMouseEnter}
          onMouseLeave={handleExpandedMouseLeave}
        />
        <div
          css={{
            pointerEvents: isExpanded ? 'auto' : 'none',
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 200ms ease',
            background: euiTheme.colors.backgroundBasePlain,
            borderRadius: 12,
            paddingBlock: euiTheme.size.s,
            paddingLeft: 12,
            paddingRight: euiTheme.size.s,
            boxShadow: BAR_SHADOW,
            display: 'inline-flex',
            maxWidth: 'min(980px, 100%)',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseEnter={handleExpandedMouseEnter}
          onMouseLeave={handleExpandedMouseLeave}
        >
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap={false}>
          {/* Left section — cross-fades between zoom (graph) and yaml actions
              (yaml). Both variants live in the same grid cell so layout stays
              stable across the 200ms opacity transition. */}
          <EuiFlexItem grow={false}>
            <div
              css={{
                display: 'grid',
                gridTemplateAreas: '"stack"',
                alignItems: 'center',
              }}
            >
              <div
                css={{
                  gridArea: 'stack',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: editorView === 'graph' ? 1 : 0,
                  pointerEvents: editorView === 'graph' ? 'auto' : 'none',
                  transition: 'opacity 200ms ease',
                }}
                aria-hidden={editorView !== 'graph'}
              >
                <EuiFlexGroup
                  gutterSize="none"
                  responsive={false}
                  alignItems="center"
                  wrap={false}
                >
                  <ZoomControls />
                </EuiFlexGroup>
              </div>
              <div
                css={{
                  gridArea: 'stack',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: editorView === 'yaml' ? 1 : 0,
                  pointerEvents: editorView === 'yaml' ? 'auto' : 'none',
                  transition: 'opacity 200ms ease',
                }}
                aria-hidden={editorView !== 'yaml'}
              >
                {yamlActionsSlot}
              </div>
            </div>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <VerticalDivider />
          </EuiFlexItem>

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
            <EuiFlexItem
              grow={false}
              css={{ alignSelf: 'stretch', display: 'flex', alignItems: 'stretch' }}
            >
              <VerticalDivider fullBar />
            </EuiFlexItem>
          ) : null}

          {testWorkflowButton ? (
            <EuiFlexItem grow={false}>
              {compact ? testWorkflowButtonCompact ?? testWorkflowButton : testWorkflowButton}
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        </div>
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
    </WorkflowBottomBarContext.Provider>
  );
}
