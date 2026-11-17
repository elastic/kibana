/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonGroup,
  EuiButtonIcon,
  euiCanAnimate,
  EuiToolTip,
  transparentize,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { keyframes } from '@emotion/react';
import { MiniMap, useReactFlow } from '@xyflow/react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';

/** Subtle entrance when navigation chrome appears after the creation state. */
const chromeAppear = keyframes({
  '0%': { opacity: 0, transform: 'scale(0.96)' },
  '100%': { opacity: 1, transform: 'scale(1)' },
});

export const chromeAppearCss = {
  [euiCanAnimate]: {
    animation: `${chromeAppear} 180ms ease-out`,
  },
};

export function CanvasZoomControls({
  onResetView,
  onFitView,
}: {
  onResetView: () => void;
  onFitView: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  // Elevate via a transparent wrapper so the segmented group's own fill is the
  // only surface color.
  const floatingShadow = useEuiShadow('m', { border: 'none' });
  const { zoomIn, zoomOut } = useReactFlow();

  const legend = i18n.translate('workflowsUi.graph.zoomControlsLegend', {
    defaultMessage: 'Zoom controls',
  });
  const zoomOutLabel = i18n.translate('workflowsUi.graph.zoomOut', {
    defaultMessage: 'Zoom out',
  });
  const zoomInLabel = i18n.translate('workflowsUi.graph.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const resetZoomLabel = i18n.translate('workflowsUi.graph.resetZoom', {
    defaultMessage: 'Reset zoom',
  });
  const fitViewLabel = i18n.translate('workflowsUi.graph.fitView', {
    defaultMessage: 'Fit to view',
  });

  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut]);
  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);

  return (
    <div
      css={[
        {
          position: 'relative',
          display: 'inline-flex',
          borderRadius: euiTheme.border.radius.control,
        },
        floatingShadow,
      ]}
    >
      <EuiButtonGroup
        legend={legend}
        variant="segmented"
        layout="vertical"
        buttonSize="s"
        wrap={false}
      >
        <EuiToolTip content={zoomInLabel} position="right" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="plus"
            aria-label={zoomInLabel}
            color="text"
            onClick={handleZoomIn}
            data-test-subj="workflowCanvas-zoom-in"
          />
        </EuiToolTip>
        <EuiToolTip content={zoomOutLabel} position="right" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minus"
            aria-label={zoomOutLabel}
            color="text"
            onClick={handleZoomOut}
            data-test-subj="workflowCanvas-zoom-out"
          />
        </EuiToolTip>
        <EuiToolTip content={resetZoomLabel} position="right" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="bullseye"
            aria-label={resetZoomLabel}
            color="text"
            onClick={onResetView}
            data-test-subj="workflowCanvas-reset-zoom"
          />
        </EuiToolTip>
        <EuiToolTip content={fitViewLabel} position="right" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="fullScreen"
            aria-label={fitViewLabel}
            color="text"
            onClick={onFitView}
            data-test-subj="workflowCanvas-fit-view"
          />
        </EuiToolTip>
      </EuiButtonGroup>
    </div>
  );
}

export function CanvasMinimap({
  nodeColor,
}: {
  nodeColor: (n: { id: string; type?: string; data?: unknown }) => string;
}) {
  const { euiTheme } = useEuiTheme();
  // Keep the shadow mixin's dark-mode ::after ring off this wrapper; that
  // overlay sits at z-index 0 and the MiniMap paints over it, so the border
  // would only show around the collapse header.
  const floatingShadow = useEuiShadow('m', { border: 'none' });
  const [isExpanded, setIsExpanded] = useState(true);

  const collapseLabel = i18n.translate('workflowsUi.graph.collapseMinimapAriaLabel', {
    defaultMessage: 'Collapse minimap',
  });
  const expandLabel = i18n.translate('workflowsUi.graph.expandMinimapAriaLabel', {
    defaultMessage: 'Expand minimap',
  });

  // Mirror segmented EuiButtonGroup chrome (control radius, xs/2 padding, plain fill).
  const groupChromeCss = {
    position: 'relative' as const,
    borderRadius: euiTheme.border.radius.control,
    background: euiTheme.colors.backgroundBasePlain,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
    padding: `calc(${euiTheme.size.xs} / 2)`,
    overflow: 'hidden' as const,
  };

  if (!isExpanded) {
    return (
      <div
        css={[
          {
            position: 'relative',
            display: 'inline-flex',
            borderRadius: euiTheme.border.radius.control,
          },
          floatingShadow,
        ]}
      >
        <EuiButtonGroup legend={expandLabel} variant="segmented" buttonSize="s" wrap={false}>
          <EuiToolTip content={expandLabel} position="left" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="map"
              aria-label={expandLabel}
              color="text"
              onClick={() => setIsExpanded(true)}
              data-test-subj="workflowCanvas-expand-minimap"
            />
          </EuiToolTip>
        </EuiButtonGroup>
      </div>
    );
  }

  return (
    <div css={[groupChromeCss, floatingShadow]}>
      <div
        css={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <EuiToolTip content={collapseLabel} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minus"
            aria-label={collapseLabel}
            color="text"
            size="xs"
            onClick={() => setIsExpanded(false)}
            data-test-subj="workflowCanvas-collapse-minimap"
          />
        </EuiToolTip>
      </div>
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        bgColor={euiTheme.colors.backgroundBaseSubdued}
        maskColor={transparentize(euiTheme.colors.backgroundBaseSubdued, 0.7)}
        nodeColor={nodeColor}
        nodeStrokeWidth={0}
        nodeBorderRadius={2}
        // Flow the panel inside our framed wrapper instead of its default
        // absolutely-positioned corner placement.
        style={{
          position: 'relative',
          inset: 'auto',
          margin: 0,
          transform: 'none',
          width: 160,
          height: 126,
          boxSizing: 'border-box',
          background: euiTheme.colors.backgroundBaseSubdued,
          borderRadius: euiTheme.border.radius.control,
        }}
      />
    </div>
  );
}
