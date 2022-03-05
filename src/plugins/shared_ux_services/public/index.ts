/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUXServicesPlugin } from './plugin';

export function plugin() {
  return new SharedUXServicesPlugin();
}

export type {
  SharedUXServicesPluginSetup,
  SharedUXServicesPluginStart,
  SharedUXServicesContext,
} from './types';

export { SharedUXServicesProvider } from './services';

export {
  useDocLinks,
  useEditors,
  usePermissions,
  usePlatformService,
  useSharedUXServices,
} from './services';

export type {
  SharedUXServices,
  SharedUXDocLinksService,
  SharedUXEditorsService,
  DataView,
  SharedUXPlatformService,
  SharedUXUserPermissionsService,
} from './services';
