/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { EuiPortal, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { GRID_OVERLAY_ID } from '../../lib/constants';
import { calculateColumnLayout, calculateRowLayout } from '../../lib/grid/calculate_grid';
import type { GridConfig } from '../../lib/grid';

interface Props {
  config: GridConfig;
}

export const GridOverlay = ({ config }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);
  const { width: viewportWidth, height: viewportHeight } = useResizeObserver(containerEl);

  const { containerCss, cellElements } = useMemo(() => {
    const container = css({
      position: 'fixed',
      inset: 0,
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
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(to right, ${config.color} 0.5px, transparent 0.5px),
              linear-gradient(to bottom, ${config.color} 0.5px, transparent 0.5px)
            `,
            backgroundSize: `${size}px ${size}px`,
          })}
          data-test-subj="gridPattern"
        />,
      ];
    } else if (config.layoutType === 'rows') {
      const { offsetTop, rowHeight } = calculateRowLayout(config, viewportHeight);

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
            position: 'fixed',
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
  }, [viewportWidth, viewportHeight, config, euiTheme.levels.toast]);

  return (
    <EuiPortal>
      <div
        ref={containerRef}
        id={GRID_OVERLAY_ID}
        className={containerCss}
        data-test-subj="gridOverlayContainer"
      >
        {cellElements}
      </div>
    </EuiPortal>
  );
};
