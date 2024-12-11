/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ExpandableFlyout } from './src';

export { useExpandableFlyoutApi } from './src/hooks/use_expandable_flyout_api';
export { useExpandableFlyoutState } from './src/hooks/use_expandable_flyout_state';
export { useExpandableFlyoutHistory } from './src/hooks/use_expandable_flyout_history';

export { type FlyoutPanels as ExpandableFlyoutState } from './src/store/state';

export { ExpandableFlyoutProvider } from './src/provider';

export type { ExpandableFlyoutProps } from './src';
export type { FlyoutPanelProps, PanelPath, ExpandableFlyoutApi } from './src/types';
