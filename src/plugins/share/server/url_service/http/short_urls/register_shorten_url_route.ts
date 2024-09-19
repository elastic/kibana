/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, IRouter } from 'kibana/server';

export const registerShortenUrlRoute = (router: IRouter, core: CoreSetup) => {
  core.http.resources.register(
    {
      path: '/api/shorten_url',
      validate: {},
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      return res.badRequest({
        body: 'This endpoint is no longer supported. Please use the new URL shortening service.',
      });
    })
  );
};
