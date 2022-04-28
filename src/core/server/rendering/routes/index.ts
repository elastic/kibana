/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PackageInfo } from '@kbn/config';
import { IRouter } from '../../http';
import { UiPlugins } from '../../plugins';
import { InternalUiServiceStart } from '../../ui';
import { registerGetPluginDependencyInfoRoute } from './get_plugin_dependency_info';

export const registerRoutes = ({
  router,
  uiPlugins,
  getUiStart,
  packageInfo,
  serverBasePath,
}: {
  router: IRouter;
  uiPlugins: UiPlugins;
  getUiStart: () => InternalUiServiceStart;
  packageInfo: PackageInfo;
  serverBasePath: string;
}) => {
  registerGetPluginDependencyInfoRoute({
    router,
    uiPlugins,
    getUiStart,
    packageInfo,
    serverBasePath,
  });
};
