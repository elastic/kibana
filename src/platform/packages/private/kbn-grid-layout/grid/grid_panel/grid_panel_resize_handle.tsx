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

import { useGridLayoutPanelEvents } from '../use_grid_layout_events';

export const ResizeHandle = React.memo(
  ({ sectionId, panelId }: { sectionId?: string; panelId: string }) => {
    const startDrag = useGridLayoutPanelEvents({
      interactionType: 'resize',
      panelId,
      sectionId,
    });

    return (
      <button
        css={styles}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onKeyDown={startDrag}
        className="kbnGridPanel--resizeHandle"
        aria-label={i18n.translate('kbnGridLayout.resizeHandle.ariaLabel', {
          defaultMessage: 'Resize panel',
        })}
      />
    );
  }
);

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    right: '0',
    bottom: '0',
    margin: '-2px',
    position: 'absolute',
    width: euiTheme.size.l,
    maxWidth: '100%',
    maxHeight: '100%',
    height: euiTheme.size.l,
    zIndex: euiTheme.levels.toast,
    scrollMarginBottom: euiTheme.size.s,
    '&:hover, &:focus': {
      cursor: 'se-resize',
    },
    '.kbnGrid--static &, .kbnGridPanel--expanded &': {
      display: 'none',
    },
  });

ResizeHandle.displayName = 'KbnGridLayoutResizeHandle';
