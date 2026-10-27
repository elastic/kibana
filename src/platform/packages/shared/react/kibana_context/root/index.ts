/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { KibanaRootContextProvider, type KibanaRootContextProviderProps } from './root_provider';
export { KibanaEuiProvider, type KibanaEuiProviderProps } from './eui_provider';
export {
  getMotionRefreshSettings,
  setMotionRefreshEnabled,
  setMotionRefreshItem,
  subscribeMotionRefreshSettings,
  useMotionRefreshSettings,
} from './motion_settings';
export type { MotionRefreshId, MotionRefreshSettings } from './motion_settings';
export { PAGE_ENTER_DURATION, SPINNER_DURATION } from './motion_prototype';
export { resolveMotionTokens } from './motion_tokens';
export type { MotionTokens } from './motion_tokens';
