/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiLoadingContent } from '@elastic/eui';

const SkeletonComponent: React.FC = () => {
  return (
    <EuiFlexItem style={{ width: 240 }} data-test-subj="tooltip-loading-content">
      <div style={{ width: 70, marginBottom: '12px' }}>
        <EuiLoadingContent lines={1} />
      </div>

      <EuiLoadingContent lines={3} />

      <div style={{ marginTop: '12px' }}>
        <EuiLoadingContent lines={1} />
      </div>
    </EuiFlexItem>
  );
};

SkeletonComponent.displayName = 'Skeleton';

export const Skeleton = SkeletonComponent;
