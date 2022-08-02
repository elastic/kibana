/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RouteDependencies } from './types';
import { BASE_API_ROUTE } from '../common';

export const registerRoutes = ({ router, log, screenshotMode }: RouteDependencies) => {
  router.get(
    { path: `${BASE_API_ROUTE}/check_is_screenshot`, validate: false },
    async (ctx, req, res) => {
      log.info(`Reading screenshot mode from a request: ${screenshotMode.isScreenshotMode(req)}`);
      log.info(`Reading is screenshot mode from ctx: ${(await ctx.screenshotMode).isScreenshot}`);
      return res.ok();
    }
  );
};
