/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';

type Loader<TElement extends React.ComponentType<any>> = () => Promise<{
  default: TElement;
}>;

/**
 * Options for the lazy loaded component
 */
export interface DynamicOptions {
  /* Fallback UI element to use when loading the component */
  fallback?: React.SuspenseProps['fallback'];
}

/**
 * Lazy load and wrap with Suspense any component.
 *
 * @example
 * // Lazy load a component
 * const Header = dynamic(() => import('./components/header'))
 * // Lazy load a component and use a fallback component while loading
 * const Header = dynamic(() => import('./components/header'), {fallback: <EuiLoadingSpinner />})
 * // Lazy load a named exported component
 * const MobileHeader = dynamic<MobileHeaderProps>(() => import('./components/header').then(mod => ({default: mod.MobileHeader})))
 */
export function dynamic<TElement extends React.ComponentType<any>, TRef = {}>(
  loader: Loader<TElement>,
  options: DynamicOptions = {}
) {
  const Component = React.lazy(loader);

  return React.forwardRef<TRef, React.ComponentPropsWithRef<TElement>>((props, ref) => (
    <Suspense fallback={options.fallback ?? null}>
      {React.createElement(Component, { ...props, ref })}
    </Suspense>
  ));
}
