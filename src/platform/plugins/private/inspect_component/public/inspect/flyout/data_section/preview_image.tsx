/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/css';
import type { ReactFiberNode } from '../../../types';

interface Props {
  preview?: ReactFiberNode | null;
}

export const PreviewImage = ({ preview }: Props) => {
  if (!preview) {
    return null;
  }

  const scale = 0.5; // TODO: Improve this
  const Component = preview.type;
  const props = preview.memoizedProps;

  const imageCss = css({
    pointerEvents: 'none',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    overflow: 'hidden',
    userSelect: 'none',
  });

  return (
    <>
      <div className={imageCss}>
        <Component {...props} />
      </div>
      <EuiSpacer size="l" />
    </>
  );
};
