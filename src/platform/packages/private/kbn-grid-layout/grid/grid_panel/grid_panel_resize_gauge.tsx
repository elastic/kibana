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
import { EuiPanel, EuiText, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { combineLatest, skip } from 'rxjs';
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
    <EuiPanel css={outerStyles} hasShadow={false} paddingSize="none">
      <div css={innerStyles}>
        <EuiText css={textStyles} size="s">
          {width}x{height}
        </EuiText>
      </div>
    </EuiPanel>
  ) : null;
});

const outerStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    right: '0',
    top: '0',
    padding: euiTheme.size.xs,
    position: 'absolute',
    zIndex: euiTheme.levels.menu,
  });

const innerStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    padding: euiTheme.size.s,
    height: euiTheme.size.l,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: transparentize(euiTheme.colors.vis.euiColorVis0, 0.2),
    borderRadius: euiTheme.border.radius.small,
  });

const textStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    fontWeight: euiTheme.font.weight.medium,
  });

ResizeGauge.displayName = 'KbnGridLayoutResizeGauge';
