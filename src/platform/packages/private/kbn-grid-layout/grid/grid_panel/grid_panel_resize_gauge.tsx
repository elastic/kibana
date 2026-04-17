/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { combineLatest, skip } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { useGridPanelState } from './use_panel_grid_data';
import { useGridLayoutContext } from '../use_grid_layout_context';

export const ResizeGauge = React.memo(({ panelId }: { panelId: string }) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [isResizing, setIsResizing] = useState(false);

  const panel$ = useGridPanelState({ panelId });
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(() => {
    /** Update the styles of the panel as it is dragged via a subscription to prevent re-renders */
    const activePanelStyleSubscription = combineLatest([
      gridLayoutStateManager.activePanelEvent$,
      panel$,
    ])
      .pipe(skip(1))
      .subscribe(([activePanel, currentPanel]) => {
        if (!currentPanel) {
          setIsResizing(false);
          return;
        }
        const ref = gridLayoutStateManager.panelRefs.current[currentPanel?.id];

        if (!ref) {
          setIsResizing(false);
          return;
        }

        const isPanelActive = activePanel && activePanel.id === currentPanel?.id;
        const isResize = activePanel?.type === 'resize';

        if (isPanelActive && isResize) {
          setIsResizing(true);
          setWidth(currentPanel.width);
          setHeight(currentPanel.height);
        } else {
          setIsResizing(false);
        }
      });

    return () => {
      activePanelStyleSubscription.unsubscribe();
    };
  }, [panel$, gridLayoutStateManager]);

  return isResizing ? (
    <div css={outerStyles} className="kbnGridPanel--resizeGauge">
      <div className="kbnGridPanel--resizeGauge--inner">
        <span className="kbnGridPanel--resizeGauge--text">
          {i18n.translate('kbnGridLayout.resizeGauge.widthByHeight', {
            defaultMessage: '{width}x{height}',
            values: { width, height },
          })}
        </span>
      </div>
    </div>
  ) : null;
});

const outerStyles = () =>
  css({
    right: '0',
    top: '0',
    position: 'absolute',
  });

ResizeGauge.displayName = 'KbnGridLayoutResizeGauge';
