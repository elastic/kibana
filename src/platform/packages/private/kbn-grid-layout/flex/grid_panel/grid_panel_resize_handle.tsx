/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { useGridLayoutPanelEvents, getDefaultResizeOptions } from '../use_grid_layout_events';

export const ResizeHandle = React.memo(({ panelId }: { panelId: string }) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const startDrag = useGridLayoutPanelEvents({
    interactionType: 'resize',
    panelId,
  });
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(() => {
    /** Change the cursor depending on if the panel can be resized in a specific direction */
    const resizeCursorSubscription = gridLayoutStateManager.layoutUpdated$.subscribe((layout) => {
      const panel = layout[panelId];
      if (!panel || panel.type !== 'panel' || !buttonRef.current) return;

      const { minWidth, maxWidth } = {
        ...getDefaultResizeOptions(),
        ...panel.resizeOptions,
      };
      let direction = 'ew';
      if (panel.width === maxWidth) {
        direction = 'w';
      } else if (panel.width === minWidth) {
        direction = 'e';
      }
      buttonRef.current.style.setProperty('--kbnDragHandleCursor', `${direction}-resize`);
    });
    return () => {
      resizeCursorSubscription.unsubscribe();
    };
  }, [gridLayoutStateManager, panelId]);

  return (
    <button
      ref={buttonRef}
      css={styles}
      onMouseDown={startDrag}
      onTouchStart={startDrag}
      onKeyDown={startDrag}
      className="kbnFlexPanel--resizeHandle"
      aria-label={i18n.translate('kbnGridLayout.flex.resizeHandle.ariaLabel', {
        defaultMessage: 'Resize panel',
      })}
    />
  );
});

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
      cursor: 'var(--kbnDragHandleCursor)',
    },
    '.kbnFlex--static &, .kbnFlexPanel--expanded &': {
      display: 'none',
    },
  });

ResizeHandle.displayName = 'kbnFlexLayoutResizeHandle';
