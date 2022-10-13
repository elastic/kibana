/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { ReactExpressionRendererProps } from './react_expression_renderer';

const ReactExpressionRendererComponent = lazy(async () => {
  const { ReactExpressionRenderer } = await import('./react_expression_renderer');

  return { default: ReactExpressionRenderer };
});

export const ReactExpressionRenderer = (props: ReactExpressionRendererProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <ReactExpressionRendererComponent {...props} />
  </Suspense>
);
