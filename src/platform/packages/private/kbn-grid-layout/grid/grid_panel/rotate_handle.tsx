/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useGridLayoutEvents } from '../use_grid_layout_events';

export const RotateHandle = React.memo(
  ({ rowIndex, panelId }: { rowIndex: number; panelId: string }) => {
    const startInteraction = useGridLayoutEvents({
      interactionType: 'resize',
      panelId,
      rowIndex,
    });

    return (
      <button
        css={styles}
        onMouseDown={startInteraction}
        onTouchStart={startInteraction}
        className="kbnGridPanel--rotateHandle"
        aria-label={i18n.translate('kbnGridLayout.resizeHandle.ariaLabel', {
          defaultMessage: 'Resize panel',
        })}
      />
    );
  }
);

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    left: '50%',
    top: '-20px',
    margin: '-2px',
    position: 'absolute',
    width: '12px',
    backgroundColor: euiTheme.colors.borderBasePlain,
    height: '12px',
    zIndex: euiTheme.levels.toast,
    touchAction: 'none',
    borderRadius: '50%',
    '&:hover, &:focus': {
      cursor:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' fill='%23000000' height='12px' width='12px' version='1.1' id='Capa_1' viewBox='0 0 214.367 214.367' xml:space='preserve'%3E%3Cpath d='M202.403,95.22c0,46.312-33.237,85.002-77.109,93.484v25.663l-69.76-40l69.76-40v23.494 c27.176-7.87,47.109-32.964,47.109-62.642c0-35.962-29.258-65.22-65.22-65.22s-65.22,29.258-65.22,65.22 c0,9.686,2.068,19.001,6.148,27.688l-27.154,12.754c-5.968-12.707-8.994-26.313-8.994-40.441C11.964,42.716,54.68,0,107.184,0 S202.403,42.716,202.403,95.22z'/%3E%3C/svg%3E\") 2 2, pointer",
    },
    '&::after': {
      display: 'block',
      content: '""',
      height: '12px',
      width: '12px',
      borderLeft: `1px dashed ${euiTheme.colors.borderBasePlain}`,
      top: '10px',
      left: '5px',
      position: 'absolute',
    },
    '.kbnGrid--static &, .kbnGridPanel--expanded &': {
      display: 'none',
    },
  });

RotateHandle.displayName = 'KbnGridLayoutRotateHandle';
