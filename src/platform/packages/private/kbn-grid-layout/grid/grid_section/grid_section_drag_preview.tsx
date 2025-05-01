/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';

export const GridSectionDragPreview = React.memo(({ sectionId }: { sectionId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(
    () => {
      return () => {
        // when drag preview unmounts, this means the header was dropped - so, scroll to it
        const headerRef = gridLayoutStateManager.headerRefs.current[sectionId];
        headerRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <div className={'kbnGridPanel--rowDragPreview'} css={styles} />;
});

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    width: '100%',
    height: euiTheme.size.xl,
    margin: `${euiTheme.size.s} 0px`,
    position: 'relative',
  });

GridSectionDragPreview.displayName = 'KbnGridLayoutSectionDragPreview';
