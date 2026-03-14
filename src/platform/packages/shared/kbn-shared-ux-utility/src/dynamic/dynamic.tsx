/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';

/**
 * Options for the lazy loaded component
 */
export interface DynamicOptions {
  /* Fallback UI element to use when loading the component */
  fallback?: React.SuspenseProps['fallback'];
}

type ExtractDynamicDefault<M> = M extends { default: infer T extends React.ComponentType<any> }
  ? T
  : M extends { default: { default: infer T extends React.ComponentType<any> } }
  ? T
  : never;

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

// Inferred types from loader (handles ESM, CJS-wrapped, and union shapes from nodenext)
export function dynamic<M extends { default: any }, TRef = {}>(
  loader: () => Promise<M>,
  options?: DynamicOptions
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<React.ComponentPropsWithRef<ExtractDynamicDefault<M>>> &
    React.RefAttributes<TRef>
>;

// Explicit type parameter for backwards compatibility: dynamic<ComponentType<Props>>(...)
export function dynamic<TElement extends React.ComponentType<any>, TRef = {}>(
  loader: () => Promise<any>,
  options?: DynamicOptions
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<React.ComponentPropsWithRef<TElement>> & React.RefAttributes<TRef>
>;

export function dynamic(loader: () => Promise<any>, options: DynamicOptions = {}) {
  const Component = React.lazy(loader);

  return React.forwardRef((props, ref) => (
    <Suspense fallback={options.fallback ?? null}>
      {React.createElement(Component, { ...props, ref })}
    </Suspense>
  ));
}
