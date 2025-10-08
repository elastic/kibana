/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, LazyExoticComponent } from 'react';
import { lazy } from 'react';
import type { Props as LazyOptInExampleFlyoutProps } from './opt_in_example_flyout';

export type { LazyOptInExampleFlyoutProps };
/**
 * Lazy-loaded {@link OptInExampleFlyout}
 */
export const LazyOptInExampleFlyout: LazyExoticComponent<
  ComponentType<LazyOptInExampleFlyoutProps>
> = lazy(() =>
  import('./opt_in_example_flyout').then(({ OptInExampleFlyout }) => ({
    default: OptInExampleFlyout,
  }))
);
