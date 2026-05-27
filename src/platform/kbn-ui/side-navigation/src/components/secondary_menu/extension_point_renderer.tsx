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

import type { SecondaryNavExtensionPointContext } from '../../../types';

export type SecondaryNavExtensionPointLazy = LazyExoticComponent<
  ComponentType<SecondaryNavExtensionPointContext>
>;

export interface ExtensionPointRendererProps {
  LazyComponent: SecondaryNavExtensionPointLazy;
  context: SecondaryNavExtensionPointContext;
}

export const ExtensionPointRenderer = ({ LazyComponent, context }: ExtensionPointRendererProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner size="s" />}>
      <LazyComponent {...context} />
    </Suspense>
  );
};
