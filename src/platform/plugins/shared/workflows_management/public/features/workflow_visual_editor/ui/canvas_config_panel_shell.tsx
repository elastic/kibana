/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_SURFACE_RADIUS } from '@kbn/workflows-ui';

/** Floating-panel inset from the canvas edges (top, right, bottom). */
export const CANVAS_CONFIG_PANEL_MARGIN = 16;
/** Minimum canvas remaining beside the panel (px). */
export const MIN_VISIBLE_CANVAS_PX = 320;
export const DEFAULT_CONFIG_PANEL_WIDTH = 560;
export const MIN_CONFIG_PANEL_WIDTH = 420;
/** Expanded field editor: catalog tree (~340) + value pane — not full-bleed. */
export const FIELD_EDITOR_EXPANDED_PANEL_WIDTH = 900;

export interface CanvasConfigPanelShellProps {
  readonly width: number;
  readonly onWidthChange: (width: number) => void;
  /** Available canvas width (wrapper). Used to enforce min-visible-canvas. */
  readonly canvasWidth: number;
  readonly children: React.ReactNode;
  readonly 'data-test-subj'?: string;
}

/**
 * Canvas-bounded floating shell for step/trigger configuration.
 * Lives inside the graph region only — never a viewport EuiFlyout — so it can
 * coexist with the push-type execution flyout on the right.
 */
export function CanvasConfigPanelShell({
  width,
  onWidthChange,
  canvasWidth,
  children,
  'data-test-subj': dataTestSubj = 'workflowStepConfigPanelContainer',
}: CanvasConfigPanelShellProps) {
  const { euiTheme } = useEuiTheme();
  const floatingShadow = useEuiShadow('m');
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const maxWidth = Math.max(
    MIN_CONFIG_PANEL_WIDTH,
    canvasWidth - MIN_VISIBLE_CANVAS_PX - CANVAS_CONFIG_PANEL_MARGIN * 2
  );
  const clampedWidth = Math.min(Math.max(width, MIN_CONFIG_PANEL_WIDTH), maxWidth);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      setIsResizing(true);
      const startX = event.clientX;
      const startWidth = clampedWidth;
      const onMove = (ev: PointerEvent) => {
        // Left-edge resize: drag left → wider.
        const delta = startX - ev.clientX;
        const nextMax = Math.max(
          MIN_CONFIG_PANEL_WIDTH,
          canvasWidth - MIN_VISIBLE_CANVAS_PX - CANVAS_CONFIG_PANEL_MARGIN * 2
        );
        const next = Math.min(nextMax, Math.max(MIN_CONFIG_PANEL_WIDTH, startWidth + delta));
        onWidthChange(next);
      };
      const onUp = (ev: PointerEvent) => {
        setIsResizing(false);
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    },
    [canvasWidth, clampedWidth, onWidthChange]
  );

  const showResizeCue = isResizeHover || isResizing;

  return (
    <div
      css={[
        {
          position: 'absolute',
          top: CANVAS_CONFIG_PANEL_MARGIN,
          right: CANVAS_CONFIG_PANEL_MARGIN,
          bottom: CANVAS_CONFIG_PANEL_MARGIN,
          width: clampedWidth,
          zIndex: euiTheme.levels.flyout,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius: WORKFLOWS_SURFACE_RADIUS,
          background: euiTheme.colors.backgroundBasePlain,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
        floatingShadow,
      ]}
      data-test-subj={dataTestSubj}
    >
      {/*
        Sit above field-editor overlays (z-index 3) so the left edge stays
        draggable while the expanded editor is open.
      */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(clampedWidth)}
        aria-valuemin={MIN_CONFIG_PANEL_WIDTH}
        aria-valuemax={Math.round(maxWidth)}
        aria-label={i18n.translate('workflows.visualEditor.resizeConfigPanel', {
          defaultMessage: 'Resize configuration panel',
        })}
        data-test-subj="workflowStepConfigPanelResizeHandle"
        onPointerDown={handleResizeStart}
        onPointerEnter={() => setIsResizeHover(true)}
        onPointerLeave={() => setIsResizeHover(false)}
        css={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 8,
          cursor: 'ew-resize',
          zIndex: 4,
          touchAction: 'none',
          // Visual cue on the panel's left edge while hovering / dragging.
          boxShadow: showResizeCue
            ? `inset 2px 0 0 0 ${euiTheme.colors.borderStrongPrimary}`
            : undefined,
        }}
      />
      <div
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
