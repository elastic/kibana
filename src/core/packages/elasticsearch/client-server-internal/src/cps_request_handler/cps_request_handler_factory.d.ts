/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OnRequestHandlerFactory } from '../cluster_client';
/**
 * Returns an {@link OnRequestHandlerFactory} that maps routing options to the
 * appropriate CPS `OnRequestHandler` for each client scope, composed with
 * timing instrumentation.
 *
 * @internal
 */
export declare function getRequestHandlerFactory(
  cpsEnabled: boolean,
  esTimingEnabled?: boolean
): OnRequestHandlerFactory;
