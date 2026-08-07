/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { dynamic } from '@kbn/shared-ux-utility';
import type { UnifiedChangePointGridProps } from './types';

const ChangePointExperienceGridLazy = dynamic(() => import('./change_point_experience_grid'), {
  fallback: (
    <EuiDelayRender delay={300}>
      <EuiSkeletonText />
    </EuiDelayRender>
  ),
});

export const LazyChangePointExperienceGrid: React.FC<UnifiedChangePointGridProps> = (props) => (
  <KibanaSectionErrorBoundary sectionName="Change point charts">
    <ChangePointExperienceGridLazy {...props} />
  </KibanaSectionErrorBoundary>
);
