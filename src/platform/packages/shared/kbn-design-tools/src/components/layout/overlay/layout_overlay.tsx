/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiPortal, useResizeObserver } from '@elastic/eui';
import type { LayoutConfig } from '../../../lib/layout/layout_config';
import { LAYOUT_OVERLAY_ID, DEVELOPER_TOOLBAR_HEIGHT } from '../../../lib/constants';
import { useOverlayZIndex } from '../../../hooks/use_overlay_z_index';
import { GridPattern } from './grid_pattern';
import { RowPattern } from './row_pattern';
import { ColumnPattern } from './column_pattern';

interface Props {
  layoutConfig: LayoutConfig;
}

export const LayoutOverlay = ({ layoutConfig }: Props) => {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);
  const { width: viewportWidth, height: viewportHeight } = useResizeObserver(containerEl);

  const zIndex = useOverlayZIndex();

  const { containerCss, content } = useMemo(() => {
    const container = css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: DEVELOPER_TOOLBAR_HEIGHT,
      pointerEvents: 'none',
      zIndex: zIndex.overlay,
    });

    let pattern: ReactNode;

    if (layoutConfig.layoutType === 'grid') {
      pattern = <GridPattern layoutConfig={layoutConfig} />;
    } else if (layoutConfig.layoutType === 'rows') {
      pattern = <RowPattern layoutConfig={layoutConfig} viewportHeight={viewportHeight} />;
    } else {
      pattern = <ColumnPattern layoutConfig={layoutConfig} viewportWidth={viewportWidth} />;
    }

    return { containerCss: container, content: pattern };
  }, [viewportWidth, viewportHeight, layoutConfig, zIndex.overlay]);

  return (
    <EuiPortal>
      <div
        ref={containerRef}
        id={LAYOUT_OVERLAY_ID}
        css={containerCss}
        data-test-subj="layoutOverlayContainer"
      >
        {content}
      </div>
    </EuiPortal>
  );
};
