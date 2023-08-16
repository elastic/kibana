/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ExpandableFlyout } from './src';
export {
  ExpandableFlyoutProvider,
  useExpandableFlyoutContext,
  type ExpandableFlyoutContext,
} from './src/context';

export type { ExpandableFlyoutApi } from './src/context';

export type { ExpandableFlyoutProps } from './src';
export type { FlyoutPanelProps, PanelPath } from './src/types';
