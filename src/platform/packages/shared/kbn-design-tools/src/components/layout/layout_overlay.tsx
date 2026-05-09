/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { EuiPortal, useEuiTheme, useResizeObserver } from '@elastic/eui';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import { DEVELOPER_TOOLBAR_ID, LAYOUT_OVERLAY_ID } from '../../lib/constants';
import { calculateColumnLayout, calculateRowLayout } from '../../lib/layout/calculate_layout';

interface Props {
  config: LayoutConfig;
}

export const LayoutOverlay = ({ config }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);
  const { width: viewportWidth, height: viewportHeight } = useResizeObserver(containerEl);

  // Measure the developer toolbar height so stripes don't overlap it
  const [toolbarHeight, setToolbarHeight] = useState(0);
  useEffect(() => {
    const toolbar = document.getElementById(DEVELOPER_TOOLBAR_ID);
    if (!toolbar) return;

    const update = () => setToolbarHeight(toolbar.getBoundingClientRect().height);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  const availableHeight = viewportHeight - toolbarHeight;

  const { containerCss, cellElements } = useMemo(() => {
    const container = css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: toolbarHeight,
      pointerEvents: 'none',
      zIndex: Number(euiTheme.levels.toast) + 2,
    });

    let elements: React.ReactNode[];

    if (config.layoutType === 'grid') {
      const size = config.cellSize > 0 ? config.cellSize : 32;
      elements = [
        <div
          key="grid-pattern"
          className={css({
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(to right, ${config.color} 1px, transparent 1px),
              linear-gradient(to bottom, ${config.color} 1px, transparent 1px)
            `,
            backgroundSize: `${size}px ${size}px`,
          })}
          data-test-subj="gridPattern"
        />,
      ];
    } else if (config.layoutType === 'rows') {
      const { offsetTop, rowHeight } = calculateRowLayout(config, availableHeight);

      elements = Array.from({ length: config.count }, (_, i) => (
        <div
          key={i}
          className={css({
            position: 'fixed',
            top: `${offsetTop + i * (rowHeight + config.gutterSize)}px`,
            left: 0,
            right: 0,
            height: `${rowHeight}px`,
            backgroundColor: config.color,
            pointerEvents: 'none',
          })}
          data-test-subj={`gridRow-${i}`}
        />
      ));
    } else {
      const { offsetLeft, columnWidth } = calculateColumnLayout(config, viewportWidth);

      elements = Array.from({ length: config.count }, (_, i) => (
        <div
          key={i}
          className={css({
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${offsetLeft + i * (columnWidth + config.gutterSize)}px`,
            width: `${columnWidth}px`,
            backgroundColor: config.color,
            pointerEvents: 'none',
          })}
          data-test-subj={`gridColumn-${i}`}
        />
      ));
    }

    return { containerCss: container, cellElements: elements };
  }, [viewportWidth, availableHeight, toolbarHeight, config, euiTheme.levels.toast]);

  return (
    <EuiPortal>
      <div
        ref={containerRef}
        id={LAYOUT_OVERLAY_ID}
        className={containerCss}
        data-test-subj="layoutOverlayContainer"
      >
        {cellElements}
      </div>
    </EuiPortal>
  );
};
