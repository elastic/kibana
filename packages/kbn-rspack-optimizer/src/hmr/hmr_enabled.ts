/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface HmrContext {
  watch: boolean;
  dist: boolean;
  profile: boolean;
  /** Explicit opt-in/opt-out from CLI flag (--no-hmr → false). undefined = auto. */
  hmrFlag?: boolean;
  /** Value of process.env.KBN_HMR */
  kbnHmrEnv?: string;
}

/**
 * Determine whether HMR should be enabled.
 *
 * HMR is on by default in watch + dev (non-dist, non-profile) mode.
 * The CLI flag (--no-hmr) takes highest priority, followed by the
 * KBN_HMR env var, followed by the auto-detection logic.
 */
export const isHmrEnabled = (ctx: HmrContext): boolean => {
  // CLI flag has highest priority
  if (ctx.hmrFlag === false) return false;
  if (ctx.hmrFlag === true) return ctx.watch && !ctx.dist && !ctx.profile;

  // Environment variable
  if (ctx.kbnHmrEnv === 'false') return false;

  // Auto: enabled in watch dev mode only
  return ctx.watch && !ctx.dist && !ctx.profile;
};
