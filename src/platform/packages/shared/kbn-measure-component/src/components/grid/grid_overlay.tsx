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

export type GridType = 'stretch' | 'center' | 'left' | 'right';

export interface GridConfig {
  columns: number;
  type: GridType;
  width: number;
  gutterSize: number;
  marginSize: number;
  color: string;
}

export const getDefaultGridConfig = (baseSize: number): GridConfig => ({
  columns: 12,
  type: 'stretch',
  width: 0,
  gutterSize: baseSize,
  marginSize: baseSize,
  color: '#FF00FF1A',
});

interface Props {
  config: GridConfig;
}

export const GridOverlay = ({ config }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);
  const { width: viewportWidth } = useResizeObserver(containerEl);

  const { containerCss, columnElements } = useMemo(() => {
    let columnWidth: number;
    let offsetLeft: number;

    if (config.type === 'stretch') {
      const availableWidth = viewportWidth - 2 * config.marginSize;
      const totalGutterWidth = config.gutterSize * (config.columns - 1);
      columnWidth = (availableWidth - totalGutterWidth) / config.columns;
      offsetLeft = config.marginSize;
    } else {
      columnWidth = config.width > 0 ? config.width : 100;
      const totalWidth = config.columns * columnWidth + (config.columns - 1) * config.gutterSize;

      if (config.type === 'center') {
        offsetLeft = (viewportWidth - totalWidth) / 2;
      } else if (config.type === 'left') {
        offsetLeft = config.marginSize;
      } else {
        offsetLeft = viewportWidth - totalWidth - config.marginSize;
      }
    }

    const cols = Array.from({ length: config.columns }, (_, i) => ({
      left: offsetLeft + i * (columnWidth + config.gutterSize),
      width: columnWidth,
    }));

    const container = css({
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: Number(euiTheme.levels.toast) + 2,
    });

    const elements = cols.map((col, i) => (
      <div
        key={i}
        className={css({
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: `${col.left}px`,
          width: `${col.width}px`,
          backgroundColor: config.color,
          pointerEvents: 'none',
        })}
        data-test-subj={`gridColumn-${i}`}
      />
    ));

    return { containerCss: container, columnElements: elements };
  }, [viewportWidth, config, euiTheme.levels.toast]);

  return (
    <EuiPortal>
      <div ref={containerRef} className={containerCss} data-test-subj="gridOverlayContainer">
        {columnElements}
      </div>
    </EuiPortal>
  );
};
