/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Context } from '@kbn/cordis';

/**
 * Creates the root Cordis Context for the browser plugin driver.
 *
 * Errors thrown inside a fiber's `apply()` are captured by the adapter's
 * try/catch and surfaced via `assertActive`, so no separate error bridge is needed.
 */
export const createCordisRoot = (): Context => new Context();
