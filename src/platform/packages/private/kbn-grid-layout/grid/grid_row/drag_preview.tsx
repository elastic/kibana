/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';

import { css } from '@emotion/react';
import { useGridLayoutContext } from '../use_grid_layout_context';

export const DragPreview = React.memo(({ rowId }: { rowId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(
    () => {
      return () => {
        // when drag preview unmounts, this means the header was dropped - so, scroll to it
        const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
        headerRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <div className={'kbnGridPanel--rowDragPreview'} css={styles} />;
});

const styles = css({
  width: '100%',
  height: '32px',
  margin: '8px 0px',
  position: 'relative',
});

DragPreview.displayName = 'KbnGridLayoutDragRowPreview';
