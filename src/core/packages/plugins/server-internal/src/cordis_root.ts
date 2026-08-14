/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { Context } from '@kbn/cordis';

/**
 * Creates the root Cordis Context and registers a Kibana logger bridge.
 *
 * The bridge must be registered before any fiber is materialised.  Without it,
 * Cordis routes activation errors (thrown inside a fiber's apply()) to an
 * in-memory ring buffer via ctx.logger.error, making every plugin boot failure
 * invisible.  The 'internal/error' event is the Cordis escape-hatch for that.
 */
export const createCordisRoot = (logger: Logger): Context => {
  const ctx = new Context();

  // Route Cordis internal errors to Kibana's logger so they appear in stdout.
  ctx.on('internal/error', (error: unknown) => {
    logger.error(error instanceof Error ? error : new Error(String(error)));
  });

  return ctx;
};
