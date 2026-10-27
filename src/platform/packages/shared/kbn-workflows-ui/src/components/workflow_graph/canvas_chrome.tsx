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
  const floatingShadow = useEuiShadow('m');
  const { zoomIn, zoomOut } = useReactFlow();

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
          background: euiTheme.colors.backgroundBasePlain,
          borderRadius: euiTheme.border.radius.panel,
          display: 'flex',
          flexDirection: 'column',
          padding: euiTheme.size.s,
          gap: euiTheme.size.xxs,
          position: 'relative',
        },
        floatingShadow,
      ]}
    >
      <EuiToolTip content={zoomInLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="plus"
          aria-label={zoomInLabel}
          color="text"
          size="s"
          onClick={handleZoomIn}
          data-test-subj="workflowCanvas-zoom-in"
        />
      </EuiToolTip>
      <EuiToolTip content={zoomOutLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="minus"
          aria-label={zoomOutLabel}
          color="text"
          size="s"
          onClick={handleZoomOut}
          data-test-subj="workflowCanvas-zoom-out"
        />
      </EuiToolTip>
      <EuiToolTip content={resetZoomLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="bullseye"
          aria-label={resetZoomLabel}
          color="text"
          size="s"
          onClick={onResetView}
          data-test-subj="workflowCanvas-reset-zoom"
        />
      </EuiToolTip>
      <EuiToolTip content={fitViewLabel} position="right" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="fullScreen"
          aria-label={fitViewLabel}
          color="text"
          size="s"
          onClick={onFitView}
          data-test-subj="workflowCanvas-fit-view"
        />
      </EuiToolTip>
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

  if (!isExpanded) {
    return (
      <div
        css={[
          {
            background: euiTheme.colors.backgroundBasePlain,
            borderRadius: euiTheme.border.radius.panel,
            border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
            padding: euiTheme.size.s,
            position: 'relative',
          },
          floatingShadow,
        ]}
      >
        <EuiToolTip content={expandLabel} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="map"
            aria-label={expandLabel}
            color="text"
            size="s"
            onClick={() => setIsExpanded(true)}
            data-test-subj="workflowCanvas-expand-minimap"
          />
        </EuiToolTip>
      </div>
    );
  }

  return (
    <div
      css={[
        {
          position: 'relative',
          borderRadius: euiTheme.border.radius.panel,
          background: euiTheme.colors.emptyShade,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          overflow: 'hidden',
          // `MiniMap` has no prop for its inner <svg>. Sizing the panel via `style`
          // to the inset box instead would change the viewBox aspect (pixel diff).
          '& .react-flow__minimap-svg': {
            margin: euiTheme.size.xs,
            width: `calc(100% - ${euiTheme.size.s})`,
            height: `calc(100% - ${euiTheme.size.s})`,
          },
        },
        floatingShadow,
      ]}
    >
      <div
        css={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: euiTheme.size.s,
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
          background: euiTheme.colors.emptyShade,
        }}
      />
    </div>
  );
}
