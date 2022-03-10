/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SharedUXServicesContext } from './types';

export {
  SharedUXServicesProvider,
  useDocLinks,
  useEditors,
  usePermissions,
  usePlatformService,
  useSharedUXServices,
} from './services';

export type { ServiceFactory } from './services/types';

export type {
  SharedUXServices,
  SharedUXDocLinksService,
  SharedUXEditorsService,
  SharedUXPlatformService,
  SharedUXUserPermissionsService,
} from './services';

export { mockServiceFactories } from './services/mocks';
export { stubServiceFactories } from './services/stub';
