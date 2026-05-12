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
import { EuiPortal, useResizeObserver } from '@elastic/eui';
import type { LayoutConfig } from '../../../lib/layout/layout_config';
import { LAYOUT_OVERLAY_ID } from '../../../lib/constants';
import { useToolbarHeight, useOverlayZIndex } from '../../../hooks';
import { GridPattern, RowPattern, ColumnPattern } from '.';

interface Props {
  layoutConfig: LayoutConfig;
}

export const LayoutOverlay = ({ layoutConfig }: Props) => {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainerEl(node), []);
  const { width: viewportWidth, height: viewportHeight } = useResizeObserver(containerEl);

  const toolbarHeight = useToolbarHeight();
  const zIndex = useOverlayZIndex();

  const { containerCss, content } = useMemo(() => {
    const container = css({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: toolbarHeight,
      pointerEvents: 'none',
      zIndex: zIndex.overlay,
    });

    let pattern: React.ReactNode;

    if (layoutConfig.layoutType === 'grid') {
      pattern = <GridPattern layoutConfig={layoutConfig} />;
    } else if (layoutConfig.layoutType === 'rows') {
      pattern = <RowPattern layoutConfig={layoutConfig} viewportHeight={viewportHeight} />;
    } else {
      pattern = <ColumnPattern layoutConfig={layoutConfig} viewportWidth={viewportWidth} />;
    }

    return { containerCss: container, content: pattern };
  }, [viewportWidth, viewportHeight, toolbarHeight, layoutConfig, zIndex.overlay]);

  return (
    <EuiPortal>
      <div
        ref={containerRef}
        id={LAYOUT_OVERLAY_ID}
        className={containerCss}
        data-test-subj="layoutOverlayContainer"
      >
        {content}
      </div>
    </EuiPortal>
  );
};
