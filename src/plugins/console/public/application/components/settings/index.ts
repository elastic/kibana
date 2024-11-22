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

export { type Props } from './settings_editor';
export { type AutocompleteOptions } from './types';

/**
 * The Lazily-loaded `SettingsEditorLazy` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const SettingsEditorLazy = React.lazy(() =>
  import('./settings_editor').then(({ SettingsEditor }) => ({
    default: SettingsEditor,
  }))
);

/**
 * A `SettingsEditor` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `SettingsEditorLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const SettingsEditor = withSuspense(SettingsEditorLazy);
