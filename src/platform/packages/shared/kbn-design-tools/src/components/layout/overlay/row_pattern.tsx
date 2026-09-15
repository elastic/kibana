/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import type { LayoutConfig } from '../../../lib/layout/layout_config';
import { calculateRowLayout } from '../../../lib/layout/calculate_layout';

interface Props {
  layoutConfig: LayoutConfig;
  viewportHeight: number;
}

export const RowPattern = ({ layoutConfig, viewportHeight }: Props) => {
  const { offsetTop, rowHeight } = calculateRowLayout(layoutConfig, viewportHeight);

  return (
    <>
      {Array.from({ length: layoutConfig.count }, (_, i) => (
        <div
          key={i}
          css={css({
            position: 'fixed',
            top: `${offsetTop + i * (rowHeight + layoutConfig.gutterSize)}px`,
            left: 0,
            right: 0,
            height: `${rowHeight}px`,
            backgroundColor: layoutConfig.color,
            pointerEvents: 'none',
          })}
          data-test-subj={`gridRow-${i}`}
        />
      ))}
    </>
  );
};
