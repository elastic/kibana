/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IToasts } from './types';

/**
 * {@link IToasts}
 * @public
 */
export type ToastsSetup = IToasts;

/**
 * {@link IToasts}
 * @public
 */
export type ToastsStart = IToasts;

/** @public */
export interface NotificationsSetup {
  /** {@link ToastsSetup} */
  toasts: ToastsSetup;
}

/** @public */
export interface NotificationsStart {
  /** {@link ToastsStart} */
  toasts: ToastsStart;
}
