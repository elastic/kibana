/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { useReactFlow, useStore } from '@xyflow/react';
import React, { type ReactNode, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

export type WorkflowDetailBottomBarView = 'yaml' | 'graph';

interface WorkflowDetailBottomBarProps {
  editorView: WorkflowDetailBottomBarView;
  onEditorViewChange: (next: WorkflowDetailBottomBarView) => void;
  toolsSlot?: ReactNode;
  testWorkflowButton?: ReactNode;
  /**
   * Extra space (in px) to add to the bar's `bottom` offset. Useful when an
   * expandable panel below (e.g. validation errors) would otherwise overlap
   * the bar.
   */
  bottomOffset?: number;
}

const PLACEHOLDER_TOOLS = [
  { id: 'tool-doc', iconType: 'documentation', label: 'Documentation' },
  { id: 'tool-search', iconType: 'search', label: 'Search' },
  { id: 'tool-add', iconType: 'plusInCircle', label: 'Add' },
  { id: 'tool-settings', iconType: 'controlsHorizontal', label: 'Settings' },
  { id: 'tool-more', iconType: 'boxesHorizontal', label: 'More' },
];

// Figma Shadow/X-large composite.
const BAR_SHADOW =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 5px 16px 0 rgba(43, 57, 79, 0.14), 0 10px 20px 0 rgba(43, 57, 79, 0.08)';

// Subtle shadow for the active view-toggle button (Figma Shadow/X-small).
const TOGGLE_ACTIVE_SHADOW =
  '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 1px 4px 0 rgba(43, 57, 79, 0.06), 0 2px 8px 0 rgba(43, 57, 79, 0.05)';

const SEPARATOR_COLOR = '#e3e8f2';
const TOGGLE_BG = '#f6f9fc';
const ICON_COLOR = '#1d2a3e'; // Figma Text/Default

const shortSeparator = (
  <EuiFlexItem grow={false} css={{ width: 1, height: 32, background: SEPARATOR_COLOR }} />
);
const tallSeparator = (
  <EuiFlexItem grow={false} css={{ width: 1, height: 54, background: SEPARATOR_COLOR }} />
);

const NOOP = () => {};

function PlaceholderIconButton({
  iconType,
  label,
  testId,
}: {
  iconType: string;
  label: string;
  testId: string;
}) {
  return (
    <EuiButtonIcon
      iconType={iconType}
      aria-label={label}
      color="text"
      size="s"
      onClick={NOOP}
      data-test-subj={testId}
    />
  );
}

// Treat any zoom within this tolerance of 1.0 as "default" so floating-point
// drift from React Flow's zoom animations doesn't keep the reset button
// visible after the user lands back at 100 %.
const ZOOM_RESET_EPS = 0.01;

function ZoomControls() {
  // useReactFlow only works inside a ReactFlowProvider. Wrap in try/catch
  // via a hook-safe fallback: the bottom bar is always rendered inside the
  // canvas (which provides the context), but if someone mounts it standalone
  // we shouldn't crash.
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
  // Subscribe to the live zoom (transform = [x, y, zoom]) so the reset
  // button shows/hides reactively as the user zooms in or out.
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
      {/* Reset-zoom button — slides in from the left with a fade when the
          current zoom drifts away from 1.0, slides back out (collapsing its
          width too) when the user returns to default zoom. */}
      <EuiFlexItem
        grow={false}
        css={{
          display: 'flex',
          overflow: 'hidden',
          // Width animates from 0 to the button's intrinsic width via
          // `max-width`; opacity/transform handle the fade-in feel.
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
        background: TOGGLE_BG,
        border: `1px solid ${SEPARATOR_COLOR}`,
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
                background: active ? '#ffffff' : 'transparent',
                boxShadow: active ? TOGGLE_ACTIVE_SHADOW : 'none',
                color: ICON_COLOR,
                transition: 'background 120ms ease, box-shadow 120ms ease',
                '&:hover': {
                  background: active ? '#ffffff' : 'rgba(29, 42, 62, 0.06)',
                },
                '&:focus-visible': {
                  outline: '2px solid #006bb8',
                  outlineOffset: 2,
                },
              }}
            >
              <EuiIcon type={iconType} size="m" color={ICON_COLOR} aria-hidden={true} />
            </button>
          </EuiToolTip>
        );
      })}
    </div>
  );
}

export function WorkflowDetailBottomBar({
  editorView,
  onEditorViewChange,
  toolsSlot,
  testWorkflowButton,
  bottomOffset = 0,
}: WorkflowDetailBottomBarProps) {
  return (
    <div
      css={{
        position: 'absolute',
        bottom: 26 + bottomOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        height: 54,
        borderRadius: 10,
        background: '#ffffff',
        boxShadow: BAR_SHADOW,
        display: 'flex',
        alignItems: 'center',
        transition: 'bottom 180ms ease',
        // Force a uniform icon color for every icon-button rendered inside
        // the bar, regardless of the EUI color prop each child uses.
        '& .euiButtonIcon, & .euiButtonIcon svg': {
          color: ICON_COLOR,
        },
      }}
      data-test-subj="workflowDetailBottomBar"
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        responsive={false}
        wrap={false}
        css={{ height: '100%' }}
      >
        <EuiFlexItem grow={false} css={{ padding: '0 12px' }}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={false}>
            <ZoomControls />
          </EuiFlexGroup>
        </EuiFlexItem>

        {shortSeparator}

        <EuiFlexItem grow={false} css={{ padding: '0 12px' }}>
          {toolsSlot ?? (
            <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={false}>
              {PLACEHOLDER_TOOLS.map((btn) => (
                <EuiFlexItem grow={false} key={btn.id}>
                  <PlaceholderIconButton
                    iconType={btn.iconType}
                    label={btn.label}
                    testId={`workflowBottomBar-${btn.id}`}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </EuiFlexItem>

        {shortSeparator}

        <EuiFlexItem grow={false} css={{ padding: '0 8px' }}>
          <ViewToggle editorView={editorView} onEditorViewChange={onEditorViewChange} />
        </EuiFlexItem>

        {testWorkflowButton && (
          <>
            {tallSeparator}
            <EuiFlexItem grow={false} css={{ padding: '7px 8px' }}>
              {testWorkflowButton}
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </div>
  );
}

export const WorkflowGraphBottomBar = WorkflowDetailBottomBar;
export type WorkflowGraphEditorView = WorkflowDetailBottomBarView;
