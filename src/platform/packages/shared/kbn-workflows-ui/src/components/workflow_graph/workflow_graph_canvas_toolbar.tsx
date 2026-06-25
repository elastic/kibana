/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useReactFlow, useStore } from '@xyflow/react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';

// Treat any zoom within this tolerance of 1.0 as default.
const ZOOM_RESET_EPS = 0.01;

export interface WorkflowGraphCanvasToolbarProps {
  readonly direction: LayoutDirection;
  readonly onDirectionChange: (direction: LayoutDirection) => void;
}

/**
 * Top-left canvas toolbar for the workflow graph.
 *
 * Must be rendered within a ReactFlowProvider so it can call `useReactFlow()`.
 */
export function WorkflowGraphCanvasToolbar({
  direction,
  onDirectionChange,
}: WorkflowGraphCanvasToolbarProps) {
  const { euiTheme } = useEuiTheme();
  const { zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();
  const isZoomed = useStore((s) => Math.abs(s.transform[2] - 1) > ZOOM_RESET_EPS);

  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleZoomReset = useCallback(() => {
    const { x, y } = getViewport();
    setViewport({ x, y, zoom: 1 }, { duration: 200 });
  }, [getViewport, setViewport]);

  const zoomInLabel = i18n.translate('workflowsUi.graphToolbar.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const zoomOutLabel = i18n.translate('workflowsUi.graphToolbar.zoomOut', {
    defaultMessage: 'Zoom out',
  });
  const zoomResetLabel = i18n.translate('workflowsUi.graphToolbar.zoomReset', {
    defaultMessage: 'Reset zoom',
  });

  const layoutVerticalLabel = i18n.translate('workflowsUi.graphToolbar.layoutVertical', {
    defaultMessage: 'Vertical layout',
  });
  const layoutHorizontalLabel = i18n.translate('workflowsUi.graphToolbar.layoutHorizontal', {
    defaultMessage: 'Horizontal layout',
  });

  const toolbarDividerCss = useMemo(
    () =>
      css({
        width: '100%',
        height: 1,
        background: euiTheme.colors.borderBaseSubdued,
      }),
    [euiTheme.colors.borderBaseSubdued]
  );

  const layoutDirectionToggleCss = useMemo(
    () =>
      css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: euiTheme.border.radius.small,
        overflow: 'hidden',
      }),
    [euiTheme.border.radius.small, euiTheme.colors.borderBaseSubdued]
  );

  return (
    <div
      css={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: euiTheme.levels.header,
        background: euiTheme.colors.backgroundBasePlain,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: euiTheme.border.radius.medium,
        padding: euiTheme.size.xs,
      }}
      data-test-subj="workflowGraphCanvasToolbar"
    >
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} alignItems="stretch">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiToolTip content={zoomInLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="plusInCircle"
                  size="s"
                  aria-label={zoomInLabel}
                  onClick={handleZoomIn}
                  data-test-subj="workflowGraphZoomIn"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={zoomOutLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="minusInCircle"
                  size="s"
                  aria-label={zoomOutLabel}
                  onClick={handleZoomOut}
                  data-test-subj="workflowGraphZoomOut"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={zoomResetLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="bullseye"
                  size="s"
                  aria-label={zoomResetLabel}
                  onClick={handleZoomReset}
                  isDisabled={!isZoomed}
                  data-test-subj="workflowGraphZoomReset"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div css={toolbarDividerCss} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div
            css={layoutDirectionToggleCss}
            role="group"
            aria-label={i18n.translate('workflowsUi.graphToolbar.layoutDirectionLegend', {
              defaultMessage: 'Layout direction',
            })}
            data-test-subj="workflowGraphLayoutDirection"
          >
            <EuiToolTip content={layoutVerticalLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="arrowDown"
                size="s"
                aria-label={layoutVerticalLabel}
                aria-pressed={direction === 'TB'}
                color={direction === 'TB' ? 'primary' : 'text'}
                onClick={() => onDirectionChange('TB')}
                data-test-subj="workflowGraphLayoutVertical"
                display={direction === 'TB' ? 'fill' : 'base'}
              />
            </EuiToolTip>
            <EuiToolTip content={layoutHorizontalLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="arrowRight"
                size="s"
                aria-label={layoutHorizontalLabel}
                aria-pressed={direction === 'LR'}
                color={direction === 'LR' ? 'primary' : 'text'}
                onClick={() => onDirectionChange('LR')}
                data-test-subj="workflowGraphLayoutHorizontal"
                display={direction === 'LR' ? 'fill' : 'base'}
              />
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
