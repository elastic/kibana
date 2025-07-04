/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

const SkeletonComponent: React.FC = () => {
  return (
    <EuiFlexItem css={{ width: 240 }} data-test-subj="tooltip-loading-content">
      <EuiSkeletonTitle size="xxxs" css={{ width: 70, marginBottom: '12px' }} />
      <EuiSkeletonText lines={3} />
      <EuiHorizontalRule margin="xs" />
      <EuiSpacer size="s" />
    </EuiFlexItem>
  );
};

SkeletonComponent.displayName = 'Skeleton';

export const Skeleton = SkeletonComponent;
