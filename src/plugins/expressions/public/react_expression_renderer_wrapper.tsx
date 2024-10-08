/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { PanelLoader } from '@kbn/panel-loader';
import type { ReactExpressionRendererProps } from './react_expression_renderer';

const ReactExpressionRendererComponent = lazy(async () => {
  const { ReactExpressionRenderer } = await import('./react_expression_renderer');

  return { default: ReactExpressionRenderer };
});

export const ReactExpressionRenderer = (props: ReactExpressionRendererProps) => (
  <Suspense fallback={<PanelLoader />}>
    <ReactExpressionRendererComponent {...props} />
  </Suspense>
);
