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
  euiCanAnimate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_CANVAS_CHROME_INSET } from './surface_radius';

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
   * Leftmost slot shown in both YAML and graph views (Actions menu + documentation).
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
  /**
   * When false, the view-toggle (Graph / YAML switch) is hidden. Use this
   * to suppress the toggle when the graph view is not available.
   */
  showViewToggle?: boolean;
}

// Container width (px) below which the bar collapses to the compact "…" pill. Chosen to give the full bar enough room before it
// starts overlapping the zoom stack (bottom-left) or minimap (bottom-right).
const COMPACT_THRESHOLD_PX = 800;

function ViewToggle({
  editorView,
  onEditorViewChange,
}: {
  editorView: WorkflowDetailBottomBarView;
  onEditorViewChange: (next: WorkflowDetailBottomBarView) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const activeToggleShadow = useEuiShadow('xs');
  const items: Array<{ id: WorkflowDetailBottomBarView; iconType: string; label: string }> = [
    {
      id: 'graph',
      iconType: 'workflow',
      label: i18n.translate('workflowsUi.bottomBar.editorViewGraph', {
        defaultMessage: 'Visual builder',
      }),
    },
    {
      id: 'yaml',
      iconType: 'code',
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
        border: euiTheme.border.thin,
        borderRadius: euiTheme.border.radius.panel,
        padding: euiTheme.size.xs,
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.xs,
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
                width: euiTheme.size.xl,
                height: euiTheme.size.xl,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                borderRadius: euiTheme.border.radius.control,
                padding: 0,
                background: active ? euiTheme.colors.backgroundBasePlain : 'transparent',
                boxShadow: active ? activeToggleShadow : 'none',
                color: euiTheme.colors.text,
                [euiCanAnimate]: { transition: 'background 120ms ease, box-shadow 120ms ease' },
                '&:hover': {
                  background: active
                    ? euiTheme.colors.backgroundBasePlain
                    : euiTheme.colors.backgroundBaseInteractiveHover,
                },
                '&:focus-visible': {
                  outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`,
                  outlineOffset: euiTheme.border.width.thick,
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

  const itemCss: CSSObject = {
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
      outline: `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`,
      outlineOffset: euiTheme.border.width.thick,
    },
  };
  // Anchors share the button look but must not pick up link colour / underline.
  const linkCss: CSSObject = {
    color: 'inherit',
    textDecoration: 'none',
    '&:hover': { textDecoration: 'none' },
  };

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
            {toolsMenuItems.map((item) => {
              const content = (
                <>
                  <EuiIcon type={item.iconType} aria-hidden />
                  <span>{item.label}</span>
                </>
              );
              const handleActivate = () => {
                item.onClick?.();
                close();
              };
              return item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.target}
                  rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                  onClick={handleActivate}
                  css={[itemCss, linkCss]}
                >
                  {content}
                </a>
              ) : (
                <button key={item.label} type="button" onClick={handleActivate} css={itemCss}>
                  {content}
                </button>
              );
            })}
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
        width: euiTheme.border.width.thin,
        height: fullBar
          ? `calc(100% + ${euiTheme.size.s} * 2)`
          : fullHeight
          ? '100%'
          : euiTheme.size.xl,
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
  showViewToggle = true,
}: WorkflowDetailBottomBarProps) {
  const { euiTheme } = useEuiTheme();
  const floatingShadow = useEuiShadow('m');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  const hasTools = Boolean(toolsSlot) || Boolean(toolsMenuItems?.length);

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
    if (isInitialPhaseRef.current) return;
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => setIsExpanded(false), 600);
  }, [disableAutoCollapse]);

  // Focus moving between the pill, the bar and its popovers must not collapse
  // it: only a blur that lands outside the bar arms the deferred collapse.
  const handleExpandedBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      handleExpandedMouseLeave();
    },
    [handleExpandedMouseLeave]
  );

  const handlePillMouseEnter = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    setIsExpanded(true);
  }, []);

  const bottomBarState = useMemo<WorkflowBottomBarContextValue>(
    () => ({ isExpanded }),
    [isExpanded]
  );

  const barCss: CSSObject = {
    position: 'absolute',
    left: -2,
    right: -2,
    bottom: WORKFLOWS_CANVAS_CHROME_INSET + bottomOffset,
    zIndex: euiTheme.levels.header,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  };

  const pillLabel = i18n.translate('workflowsUi.bottomBar.expandControls', {
    defaultMessage: 'Show toolbar',
  });

  return (
    <WorkflowBottomBarContext.Provider value={bottomBarState}>
      <div ref={containerRef} css={barCss} data-test-subj="workflowDetailBottomBar">
        {/* Collapsed pill — hover to expand. Precedes the bar in DOM order so Tab from
            the focused pill continues into the bar it just revealed. */}
        <div
          role="button"
          tabIndex={isExpanded ? -1 : 0}
          aria-label={pillLabel}
          css={[
            {
              position: 'absolute',
              left: '50%',
              bottom: 0,
              transform: 'translateX(-50%)',
              pointerEvents: isExpanded ? 'none' : 'auto',
              opacity: isExpanded ? 0 : 1,
              [euiCanAnimate]: { transition: 'opacity 200ms ease' },
              width: euiTheme.size.xxxxl,
              height: euiTheme.size.l,
              background: euiTheme.colors.primary,
              borderRadius: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            },
            floatingShadow,
          ]}
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
          <EuiIcon
            type="boxesVertical"
            size="s"
            color={euiTheme.colors.emptyShade}
            css={{ transform: 'rotate(90deg)' }}
            aria-hidden
          />
        </div>

        <div
          css={[
            {
              pointerEvents: isExpanded ? 'auto' : 'none',
              opacity: isExpanded ? 1 : 0,
              // Hidden once faded out so the collapsed controls leave the tab
              // order and the accessibility tree.
              visibility: isExpanded ? 'visible' : 'hidden',
              [euiCanAnimate]: {
                transition: isExpanded
                  ? 'opacity 200ms ease'
                  : 'opacity 200ms ease, visibility 0s linear 200ms',
              },
              background: euiTheme.colors.backgroundBasePlain,
              borderRadius: euiTheme.border.radius.panel,
              paddingBlock: euiTheme.size.s,
              paddingLeft: euiTheme.size.m,
              paddingRight: euiTheme.size.s,
              display: 'inline-flex',
              maxWidth: 'min(980px, 100%)',
              position: 'relative',
              zIndex: 1,
            },
            floatingShadow,
          ]}
          onMouseEnter={handleExpandedMouseEnter}
          onMouseLeave={handleExpandedMouseLeave}
          onFocus={handleExpandedMouseEnter}
          onBlur={handleExpandedBlur}
          data-test-subj="workflowDetailBottomBarContent"
        >
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap={false}>
            {/* Left section — Actions menu + documentation in both editor views. */}
            {yamlActionsSlot ? (
              <>
                <EuiFlexItem grow={false}>{yamlActionsSlot}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <VerticalDivider />
                </EuiFlexItem>
              </>
            ) : null}

            {hasTools && compact ? (
              <EuiFlexItem grow={false}>
                <CompactToolsMenu toolsMenuItems={toolsMenuItems} toolsSlot={toolsSlot} />
              </EuiFlexItem>
            ) : hasTools ? (
              <EuiFlexItem grow={false}>{toolsSlot}</EuiFlexItem>
            ) : null}

            {showViewToggle ? (
              <>
                {hasTools ? (
                  <EuiFlexItem grow={false}>
                    <VerticalDivider />
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <ViewToggle editorView={editorView} onEditorViewChange={onEditorViewChange} />
                </EuiFlexItem>
              </>
            ) : null}

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
    </WorkflowBottomBarContext.Provider>
  );
}
