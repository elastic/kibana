/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceFactory, SharedUxServices } from '@kbn/shared-ux-services';

import { applicationServiceFactory } from './application';
import { docLinksServiceFactory } from './doc_links';
import { editorsServiceFactory } from './editors';
import { httpServiceFactory } from './http';
import { platformServiceFactory } from './platform';
import { userPermissionsServiceFactory } from './permissions';
import { dataServiceFactory } from './data';

export { applicationServiceFactory } from './application';
export { docLinksServiceFactory } from './doc_links';
export { editorsServiceFactory } from './editors';
export { httpServiceFactory } from './http';
export { platformServiceFactory } from './platform';
export { userPermissionsServiceFactory } from './permissions';
export { dataServiceFactory } from './data';

/**
 * A factory function for creating a Storybook implementation of `SharedUxServices`.
 */
export const servicesFactory: ServiceFactory<SharedUxServices, {}> = (params) => ({
  application: applicationServiceFactory(),
  docLinks: docLinksServiceFactory(),
  editors: editorsServiceFactory(),
  http: httpServiceFactory(params),
  permissions: userPermissionsServiceFactory(),
  platform: platformServiceFactory(params),
  data: dataServiceFactory(),
});
