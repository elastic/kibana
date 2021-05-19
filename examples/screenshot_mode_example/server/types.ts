/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, Logger } from 'kibana/server';
import { ScreenshotModeRequestHandlerContext } from '../../../src/plugins/screenshot_mode/server';
import { ScreenshotModePluginSetup } from '../../../src/plugins/screenshot_mode/server';

export type ScreenshotModeExampleRouter = IRouter<ScreenshotModeRequestHandlerContext>;

export interface RouteDependencies {
  screenshotMode: ScreenshotModePluginSetup;
  router: ScreenshotModeExampleRouter;
  log: Logger;
}
