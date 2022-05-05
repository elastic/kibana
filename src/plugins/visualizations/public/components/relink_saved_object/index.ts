/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { withSuspense } from '@kbn/shared-ux-utility';
import React from 'react';

/**
 *  A `RelinkSavedObject` component, with service hooks. Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const RelinkSavedObjectLazy = React.lazy(() =>
  import('./relink_saved_object').then(({ RelinkSavedObject }) => ({
    default: RelinkSavedObject,
  }))
);

/**
 * A `RelinkSavedObject` component. The component is wrapped by the `withSuspense` HOC.
 * This component can be used directly by consumers and will load the `RelinkSavedObjectLazy` lazily with
 * a predefined fallback and error boundary.
 */
export const RelinkSavedObject = withSuspense(RelinkSavedObjectLazy);

export {
  shouldShowRelinkSavedObjectError,
  getRelinkSavedObjectErrorMessage,
} from './relink_saved_object_utils';

export type { RelinkSavedObjectMeta, RelinkCallback } from './types';
