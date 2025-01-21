/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { GridLayoutStateManager } from '../types';
import { useGridLayoutEvents } from '../use_grid_layout_events';

export const ResizeHandle = ({
  gridLayoutStateManager,
  rowIndex,
  panelId,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
  rowIndex: number;
  panelId: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const startInteraction = useGridLayoutEvents({
    interactionType: 'resize',
    gridLayoutStateManager,
    panelId,
    rowIndex,
  });

  return (
    <button
      onMouseDown={startInteraction}
      onTouchStart={startInteraction}
      className="kbnGridPanel--resizeHandle"
      aria-label={i18n.translate('kbnGridLayout.resizeHandle.ariaLabel', {
        defaultMessage: 'Resize panel',
      })}
      css={css`
        right: 0;
        bottom: 0;
        margin: -2px;
        position: absolute;
        width: ${euiTheme.size.l};
        max-width: 100%;
        max-height: 100%;
        height: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.toast};
        &:hover,
        &:focus {
          cursor: se-resize;
        }
        .kbnGrid--static &,
        .kbnGridPanel--expanded & {
          display: none;
        }
        touch-action: none;
      `}
    />
  );
};
