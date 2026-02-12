/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';

export const CalloutSkeleton: FC = () => {
  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem>
          <EuiSkeletonRectangle width="100%" height={130} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSkeletonText lines={1} size="m" />
          <EuiSpacer size="s" />
          <EuiSkeletonText lines={4} size="s" />
          <EuiSpacer size="m" />
          <EuiSkeletonRectangle width="100%" height={45} borderRadius="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
