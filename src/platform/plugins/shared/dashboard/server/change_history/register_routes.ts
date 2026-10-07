/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { StartDeps } from '../plugin';
import type { DashboardPluginStart } from '../types';
import { registerChangeDetailsRoute } from './register_details_route';
import { registerHistoryListRoute } from './register_list_route';
import { registerRestoreChangeRoute } from './register_restore_route';

export function registerChangeHistoryRoute(
  core: CoreSetup<StartDeps, DashboardPluginStart>,
  router: IRouter<RequestHandlerContext>
) {
  registerHistoryListRoute(core, router);
  registerChangeDetailsRoute(router);
  registerRestoreChangeRoute(router);
}
