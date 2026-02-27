/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { combineLatest, filter, map, pairwise, skip, startWith } from 'rxjs';
import { useGridPanelState } from './use_panel_grid_data';
import { useGridLayoutContext } from '../use_grid_layout_context';

export const ResizeGauge = React.memo(({ panelId }: { panelId: string }) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [isResizing, setIsResizing] = useState(false);

  const panel$ = useGridPanelState({ panelId });
  const { euiTheme } = useEuiTheme();
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(() => {
    /** Update the styles of the panel as it is dragged via a subscription to prevent re-renders */
    const activePanelStyleSubscription = combineLatest([
      gridLayoutStateManager.activePanelEvent$.pipe(
        // filter out the first active panel event to allow "onClick" events through
        pairwise(),
        filter(([before]) => before !== undefined),
        map(([, after]) => after),
        startWith(undefined)
      ),
      panel$,
    ])
      .pipe(skip(1))
      .subscribe(([activePanel, currentPanel]) => {
        if (!currentPanel) {
          setIsResizing(false);
          return;
        }
        const ref = gridLayoutStateManager.panelRefs.current[currentPanel?.id];
        const isPanelActive = activePanel && activePanel.id === currentPanel?.id;
        if (!ref) {
          setIsResizing(false);
          return;
        }

        if (isPanelActive) {
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
  }, [panel$, gridLayoutStateManager, euiTheme.levels.modal]);

  return isResizing ? (
    <div css={styles}>
      <EuiText size="s">
        {width}x{height}
      </EuiText>
    </div>
  ) : null;
});

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    right: '0',
    top: '0',
    margin: euiTheme.size.xs,
    padding: euiTheme.size.s,
    backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    position: 'absolute',
  });

ResizeGauge.displayName = 'KbnGridLayoutResizeGauge';
