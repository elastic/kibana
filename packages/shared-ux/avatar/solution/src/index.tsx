/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export type { KibanaSolutionAvatarProps } from './solution_avatar';

/**
 * The Lazily-loaded `KibanaSolutionAvatar` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const KibanaSolutionAvatarLazy = React.lazy(() =>
  import('./solution_avatar').then(({ KibanaSolutionAvatar }) => ({
    default: KibanaSolutionAvatar,
  }))
);

/**
 * A `KibanaSolutionAvatar` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `KibanaPageTemplateSolutionNavAvatarLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const KibanaSolutionAvatar = withSuspense(KibanaSolutionAvatarLazy);
