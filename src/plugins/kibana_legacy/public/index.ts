/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { KibanaLegacyPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new KibanaLegacyPlugin(initializerContext);

export * from './plugin';

export { initAngularBootstrap } from './angular_bootstrap';
export { PaginateDirectiveProvider, PaginateControlsDirectiveProvider } from './paginate/paginate';
export * from './angular';
export * from './notify';
export * from './utils';
