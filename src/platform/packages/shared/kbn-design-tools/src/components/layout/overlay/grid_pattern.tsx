/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/css';
import type { LayoutConfig } from '../../../lib/layout/layout_config';

interface Props {
  layoutConfig: LayoutConfig;
}

export const GridPattern = ({ layoutConfig }: Props) => {
  const size = layoutConfig.cellSize > 0 ? layoutConfig.cellSize : 32;

  return (
    <div
      className={css({
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(to right, ${layoutConfig.color} 1px, transparent 1px),
          linear-gradient(to bottom, ${layoutConfig.color} 1px, transparent 1px)
        `,
        backgroundSize: `${size}px ${size}px`,
      })}
      data-test-subj="gridPattern"
    />
  );
};
