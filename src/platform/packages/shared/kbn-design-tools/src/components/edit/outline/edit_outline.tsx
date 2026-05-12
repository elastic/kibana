/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';
import {
  ALL_HANDLES,
  DEVTOOL_RESIZE_HANDLE_ATTR,
  HANDLE_CURSORS,
  RESIZE_HANDLE_SIZE,
} from '../../../lib/constants';
import { useOverlayZIndex } from '../../../hooks';
import { getHandleMode, getHandlePositions } from '../resize_helpers';
import { OutlineControls } from './controls';

interface Props {
  target: HTMLElement;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}

export const EditOutline = ({ target, onDelete, onDuplicate, onEdit }: Props) => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();

  const outlineCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return css({
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: zIndex.highlight,
      border: `2px solid ${accentColor}`,
      borderRadius: '2px',
    });
  }, [euiTheme.colors.primary, zIndex.highlight]);

  const handleCss = useMemo(() => {
    const accentColor = euiTheme.colors.primary;
    return css({
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
  const mode = getHandleMode(rect);
  const visibleHandles =
    mode === 'none'
      ? []
      : mode === 'corners'
      ? ALL_HANDLES.filter((h) => h.length === 2)
      : ALL_HANDLES;

  const handlePositions = getHandlePositions(rect.width, rect.height, RESIZE_HANDLE_SIZE);

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
      <OutlineControls onDelete={onDelete} onDuplicate={onDuplicate} onEdit={onEdit} />
    </div>
  );
};
