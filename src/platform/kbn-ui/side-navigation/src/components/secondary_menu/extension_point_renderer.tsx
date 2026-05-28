/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

/**
 * Context passed to lazy extension point renderers.
 */
export interface SecondaryNavExtensionPointContext {
  extensionPointId: string;
  solutionId: string;
  primaryItemId: string;
  sectionId: string;
  surface: 'popover' | 'sidePanel' | 'overflow';
  activeItemId?: string;
}

/**
 * Lazy component for an extension point renderer.
 */
export type SecondaryNavExtensionPointLazy = LazyExoticComponent<
  ComponentType<SecondaryNavExtensionPointContext>
>;

/**
 * Props for an extension point renderer.
 */
export interface ExtensionPointRendererProps {
  LazyComponent: SecondaryNavExtensionPointLazy;
  context: SecondaryNavExtensionPointContext;
}

export type ExtensionPointRenderersMap = Record<string, SecondaryNavExtensionPointLazy>;

export const ExtensionPointRenderer = ({ LazyComponent, context }: ExtensionPointRendererProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <LazyComponent {...context} />
    </Suspense>
  );
};
