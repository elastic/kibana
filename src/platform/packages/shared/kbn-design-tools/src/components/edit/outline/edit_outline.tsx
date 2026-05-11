/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css as emotionCss } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import {
  DEVTOOL_RESIZE_HANDLE_ATTR,
  HANDLE_CURSORS,
  RESIZE_HANDLE_SIZE,
} from '../../../lib/constants';
import type { ResizeHandle } from '../../../lib/constants';
import { getHandleMode } from '../resize_helpers';

interface Props {
  target: HTMLElement;
}

const ALL_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export const EditOutline = ({ target }: Props) => {
  const { euiTheme } = useEuiTheme();

  const outlineCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return emotionCss({
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: Number(euiTheme.levels.toast) + 3,
      border: `2px solid ${accentColor}`,
      borderRadius: '2px',
    });
  }, [euiTheme.colors.primary, euiTheme.levels.toast]);

  const handleCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return emotionCss({
      position: 'absolute',
      width: RESIZE_HANDLE_SIZE,
      height: RESIZE_HANDLE_SIZE,
      background: accentColor,
      border: `1px solid ${accentColor}`,
      borderRadius: '1px',
      pointerEvents: 'auto',
    });
  }, [euiTheme.colors.primary]);

  const rect = target.getBoundingClientRect();
  const half = RESIZE_HANDLE_SIZE / 2;
  const mode = getHandleMode(rect);
  const visibleHandles =
    mode === 'none'
      ? []
      : mode === 'corners'
      ? ALL_HANDLES.filter((h) => h.length === 2)
      : ALL_HANDLES;

  const handlePositions: Record<ResizeHandle, { top: number; left: number }> = {
    nw: { top: -half, left: -half },
    n: { top: -half, left: rect.width / 2 - half },
    ne: { top: -half, left: rect.width - half },
    e: { top: rect.height / 2 - half, left: rect.width - half },
    se: { top: rect.height - half, left: rect.width - half },
    s: { top: rect.height - half, left: rect.width / 2 - half },
    sw: { top: rect.height - half, left: -half },
    w: { top: rect.height / 2 - half, left: -half },
  };

  return (
    <div
      className={outlineCss}
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      data-test-subj="editOverlayOutline"
    >
      {visibleHandles.map((h) => (
        <div
          key={h}
          className={handleCss}
          style={{
            top: handlePositions[h].top,
            left: handlePositions[h].left,
            cursor: HANDLE_CURSORS[h],
          }}
          {...{ [DEVTOOL_RESIZE_HANDLE_ATTR]: h }}
          data-test-subj={`editOverlayResizeHandle-${h}`}
        />
      ))}
    </div>
  );
};
