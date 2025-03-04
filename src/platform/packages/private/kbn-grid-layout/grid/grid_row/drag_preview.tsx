/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';

import { css } from '@emotion/react';
import { UseEuiTheme } from '@elastic/eui';
// import { useGridLayoutContext } from '../use_grid_layout_context';

export const DragPreview = React.memo(({ rowId }: { rowId: string }) => {
  // const { gridLayoutStateManager } = useGridLayoutContext();

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  return <div ref={dragPreviewRef} className={'kbnGridPanel--rowDragPreview'} css={styles} />;
});

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    width: '100%',
    height: '32px',
    margin: '8px 0px',
    backgroundColor: euiTheme.components.dragDropDraggingBackground,
    position: 'relative',
  });

DragPreview.displayName = 'KbnGridLayoutDragRowPreview';
