/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { VariablesEditor as VariablesEditorComponent } from './variables_editor';

export { type Props } from './variables_editor';
export { type DevToolsVariable } from './types';

/**
 * The Lazily-loaded `VariablesEditorLazy` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
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
export const VariablesEditor = VariablesEditorComponent;
