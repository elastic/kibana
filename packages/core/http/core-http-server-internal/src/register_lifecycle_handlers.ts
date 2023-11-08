/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Env } from '@kbn/config';
import { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';
import type { LifecycleRegistrar } from './http_server';
import {
  createCustomHeadersPreResponseHandler,
  createRestrictInternalRoutesPostAuthHandler,
  createVersionCheckPostAuthHandler,
  createBuildNrMismatchLoggerPreResponseHandler,
  createXsrfPostAuthHandler,
} from './lifecycle_handlers';

export const registerCoreHandlers = (
  registrar: LifecycleRegistrar,
  config: HttpConfig,
  env: Env,
  log: Logger
) => {
  // add headers based on config
  registrar.registerOnPreResponse(createCustomHeadersPreResponseHandler(config));
  // add extra request checks stuff
  registrar.registerOnPostAuth(createXsrfPostAuthHandler(config));
  if (config.versioned.strictClientVersionCheck !== false) {
    // add check on version
    registrar.registerOnPostAuth(createVersionCheckPostAuthHandler(env.packageInfo.version));
  } else {
    registrar.registerOnPreResponse(
      createBuildNrMismatchLoggerPreResponseHandler(env.packageInfo.buildNum, log)
    );
  }
  // add check on header if the route is internal
  registrar.registerOnPostAuth(createRestrictInternalRoutesPostAuthHandler(config)); // strictly speaking, we should have access to route.options.access from the request on postAuth
};
