/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { ServiceFactory, SharedUxServices, SharedUxServicesContext } from './types';
export type {
  SharedUxDocLinksService,
  SharedUxEditorsService,
  SharedUxPlatformService,
  SharedUxUserPermissionsService,
} from './services';

export {
  SharedUxServicesProvider,
  useDocLinks,
  useEditors,
  usePermissions,
  usePlatformService,
  useSharedUxServices,
} from './context';

export {
  mockServiceFactories,
  mockServicesFactory,
  stubServiceFactories,
  stubServicesFactory,
} from './services';
