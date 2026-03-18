/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSpaceNPRE, PROJECT_ROUTING_ORIGIN } from '@kbn/cps-server-utils';
import type { OnRequestHandlerFactory } from '../cluster_client';
import { getCpsRequestHandler } from './cps_request_handler';

/**
 * Returns an {@link OnRequestHandlerFactory} that maps routing options to the
 * appropriate CPS `OnRequestHandler` for each client scope.
 *
 * @internal
 */
export function getRequestHandlerFactory(cpsEnabled: boolean): OnRequestHandlerFactory {
  return (opts) => {
    if ('projectRouting' in opts && opts.projectRouting === 'space') {
      return getCpsRequestHandler(cpsEnabled, getSpaceNPRE(opts.request), opts.logger);
    } else {
      return getCpsRequestHandler(cpsEnabled, PROJECT_ROUTING_ORIGIN, opts.logger);
    }
  };
}
