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
import { calculateColumnLayout } from '../../../lib/layout/calculate_layout';

interface Props {
  layoutConfig: LayoutConfig;
  viewportWidth: number;
}

export const ColumnPattern = ({ layoutConfig, viewportWidth }: Props) => {
  const { offsetLeft, columnWidth } = calculateColumnLayout(layoutConfig, viewportWidth);

  return (
    <>
      {Array.from({ length: layoutConfig.count }, (_, i) => (
        <div
          key={i}
          className={css({
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${offsetLeft + i * (columnWidth + layoutConfig.gutterSize)}px`,
            width: `${columnWidth}px`,
            backgroundColor: layoutConfig.color,
            pointerEvents: 'none',
          })}
          data-test-subj={`gridColumn-${i}`}
        />
      ))}
    </>
  );
};
