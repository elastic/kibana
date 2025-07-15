/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export { type Props } from './variables_editor';
export { type DevToolsVariable } from './types';

/**
 * A `VariablesEditor` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `VariablesEditorLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const VariablesEditorLazy = React.lazy(() =>
  import('./variables_editor').then(({ VariablesEditor }) => ({
    default: VariablesEditor,
  }))
);

/**
 * Direct import of VariablesEditor component for packaged environments.
 * This bypasses the lazy loading mechanism that doesn't work well in bundled packages.
 */
export const VariablesEditor = withSuspense(VariablesEditorLazy);
