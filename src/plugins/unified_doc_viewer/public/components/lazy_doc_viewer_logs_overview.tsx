/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';

export const UnifiedDocViewerLogsOverview = dynamic(() => import('./doc_viewer_logs_overview'), {
  fallback: (
    <EuiDelayRender delay={300}>
      <EuiSkeletonText />
    </EuiDelayRender>
  ),
});
