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

export const DragPreview = React.memo(({ rowId }: { rowId: string }) => {
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  return <div ref={dragPreviewRef} className={'kbnGridPanel--rowDragPreview'} css={styles} />;
});

const styles = css({
  width: '100%',
  height: '32px',
  margin: '8px 0px',
  position: 'relative',
});

DragPreview.displayName = 'KbnGridLayoutDragRowPreview';
