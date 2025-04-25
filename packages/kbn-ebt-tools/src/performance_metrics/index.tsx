/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense } from 'react';

type Loader<TElement extends React.ComponentType<any>> = () => Promise<{
  default: TElement;
}>;

function dynamic<TElement extends React.ComponentType<any>, TRef = {}>(loader: Loader<TElement>) {
  const Component = React.lazy(loader);

  return React.forwardRef<TRef, React.ComponentPropsWithRef<TElement>>((props, ref) => (
    <Suspense fallback={null}>{React.createElement(Component, { ...props, ref })}</Suspense>
  ));
}

export { usePerformanceContext } from './context/use_performance_context';
export { perfomanceMarkers } from './performance_markers';
export { usePageReady } from './context/use_page_ready';
export const PerformanceContextProvider = dynamic(() => import('./context/performance_context'));
