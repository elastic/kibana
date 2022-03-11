/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceFactory, SharedUxServices } from '@kbn/shared-ux-services';

import { platformServiceFactory } from './platform';
import { editorsServiceFactory } from './editors';
import { userPermissionsServiceFactory } from './permissions';
import { docLinksServiceFactory } from './doc_links';

export { platformServiceFactory } from './platform';
export { editorsServiceFactory } from './editors';
export { userPermissionsServiceFactory } from './permissions';
export { docLinksServiceFactory } from './doc_links';

/**
 * A factory function for creating a Storybook implementation of `SharedUxServices`.
 */
export const servicesFactory: ServiceFactory<SharedUxServices, {}> = (params) => ({
  platform: platformServiceFactory(params),
  permissions: userPermissionsServiceFactory(),
  editors: editorsServiceFactory(),
  docLinks: docLinksServiceFactory(),
});
