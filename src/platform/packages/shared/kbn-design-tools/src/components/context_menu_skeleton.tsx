/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHorizontalRule, EuiSkeletonRectangle } from '@elastic/eui';
import { css } from '@emotion/react';

const panelCss = css({ width: 180, padding: '8px 0', height: 290 });
const rowCss = css({ padding: '10px 12px' });

const SkeletonRow = () => (
  <div css={rowCss}>
    <EuiSkeletonRectangle width="100%" height={12} borderRadius="s" />
  </div>
);

export const ContextMenuSkeleton = () => (
  <div css={panelCss}>
    <SkeletonRow />
    <SkeletonRow />
    <EuiHorizontalRule margin="xs" />
    <SkeletonRow />
    <SkeletonRow />
    <EuiHorizontalRule margin="xs" />
    <SkeletonRow />
    <EuiHorizontalRule margin="xs" />
    <SkeletonRow />
    <SkeletonRow />
  </div>
);
