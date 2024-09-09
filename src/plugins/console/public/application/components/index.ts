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

export { NetworkRequestStatusBar } from './network_request_status_bar';
export { SomethingWentWrongCallout } from './something_went_wrong_callout';
export type { TopNavMenuItem } from './top_nav_menu';
export { TopNavMenu } from './top_nav_menu';
export { ConsoleMenu } from './console_menu';
export { WelcomePanel } from './welcome_panel';
export type { AutocompleteOptions } from './settings_modal';
export { HelpPanel } from './help_panel';
export { EditorContentSpinner } from './editor_content_spinner';
export type { DevToolsVariable } from './variables';

/**
 * The Lazily-loaded `DevToolsSettingsModal` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const DevToolsSettingsModalLazy = React.lazy(() =>
  import('./settings_modal').then(({ DevToolsSettingsModal }) => ({
    default: DevToolsSettingsModal,
  }))
);

/**
 * A `DevToolsSettingsModal` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DevToolsSettingsModalLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const DevToolsSettingsModal = withSuspense(DevToolsSettingsModalLazy);

/**
 * The Lazily-loaded `DevToolsVariablesFlyout` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const DevToolsVariablesFlyoutLazy = React.lazy(() =>
  import('./variables').then(({ DevToolsVariablesFlyout }) => ({
    default: DevToolsVariablesFlyout,
  }))
);

/**
 * A `DevToolsVariablesFlyout` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DevToolsVariablesFlyoutLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const DevToolsVariablesFlyout = withSuspense(DevToolsVariablesFlyoutLazy);
