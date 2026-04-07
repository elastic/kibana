/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getSpaceNPRE,
  getSpaceNPREFromBasePath,
  PROJECT_ROUTING_ORIGIN,
} from '@kbn/cps-server-utils';
import type { IBasePath } from '@kbn/core-http-server';
import { isKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { OnRequestHandlerFactory, OnRequestHandler } from '../cluster_client';
import { getCpsRequestHandler } from './cps_request_handler';
import { getTimingRequestHandler } from '../timing';

const noopHandler: OnRequestHandler = () => undefined;

export interface GetRequestHandlerFactoryDeps {
  /**
   * When set, space CPS routing uses {@link IBasePath#get} to resolve the active
   * space (same as Spaces), so rewritten URLs still get the correct NPRE.
   */
  basePath?: Pick<IBasePath, 'get' | 'serverBasePath'>;
}

/**
 * Returns an {@link OnRequestHandlerFactory} that maps routing options to the
 * appropriate CPS `OnRequestHandler` for each client scope, composed with
 * timing instrumentation.
 *
 * @internal
 */
export function getRequestHandlerFactory(
  cpsEnabled: boolean,
  esTimingEnabled: boolean = true,
  factoryDeps?: GetRequestHandlerFactoryDeps
): OnRequestHandlerFactory {
  return (opts) => {
    const request = 'request' in opts && isKibanaRequest(opts.request) ? opts.request : undefined;

    // Get the timing handler (or noop if disabled)
    const timingHandler = esTimingEnabled ? getTimingRequestHandler(request) : noopHandler;

    // Get the CPS handler based on routing options
    const cpsHandler =
      'projectRouting' in opts && opts.projectRouting === 'space' && request
        ? getCpsRequestHandler(
            cpsEnabled,
            factoryDeps?.basePath
              ? getSpaceNPREFromBasePath(
                  factoryDeps.basePath.get(request),
                  factoryDeps.basePath.serverBasePath
                )
              : getSpaceNPRE(request),
            opts.logger
          )
        : getCpsRequestHandler(cpsEnabled, PROJECT_ROUTING_ORIGIN, opts.logger);

    // Return a composed handler that calls both in sequence
    return (ctx, params, options, logger) => {
      timingHandler(ctx, params, options, logger);
      cpsHandler(ctx, params, options, logger);
    };
  };
}
