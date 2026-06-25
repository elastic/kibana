/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { FlyoutHistoryProvider } from './src/history_provider';

export { useFlyoutHistoryKey } from './src/history_context';
export { useHistoryItems } from './src/history_context';
export { useCloseHistoryGroup, useGoBack, useGoToFlyout } from './src/hooks';

export { HistoryMenuBar } from './src/history_menu_bar';

export type { FlyoutHistoryContextValue, HistoryItem } from './src/history_context';
