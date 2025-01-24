/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
<<<<<<< HEAD
import { PanelInteractionEvent, UserInteractionEvent } from '../types';
=======
import { GridLayoutStateManager } from '../types';
import { useGridLayoutEvents } from '../use_grid_layout_events';
>>>>>>> 02455ffe3a6e ([Dashboard][Collapsable panels] Enable touch between panel sections and refactor events flow  (#206941))

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
<<<<<<< HEAD
=======
  const startInteraction = useGridLayoutEvents({
    interactionType: 'resize',
    gridLayoutStateManager,
    panelId,
    rowIndex,
  });
>>>>>>> 02455ffe3a6e ([Dashboard][Collapsable panels] Enable touch between panel sections and refactor events flow  (#206941))

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
