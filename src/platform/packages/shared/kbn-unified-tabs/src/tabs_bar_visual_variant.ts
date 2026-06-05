/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Visual treatment for the tabs bar.
 * - `appContainer`: folder-style tabs glued to the app content (default).
 * - `inlineAppHeader`: compact pill tabs for use inside Chrome Next AppHeader titleAppend.
 */
export type TabsBarVisualVariant = 'appContainer' | 'inlineAppHeader';

export const DEFAULT_TABS_BAR_VISUAL_VARIANT: TabsBarVisualVariant = 'appContainer';
