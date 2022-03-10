/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SharedUXServices } from '../.';
import { ServiceFactory } from '../types';

import { docLinksServiceFactory } from './doc_links.mock';
import { editorsServiceFactory } from './editors.mock';
import { platformServiceFactory } from './platform.mock';
import { userPermissionsServiceFactory } from './permissions.mock';

export type { MockDockLinksServiceFactory } from './doc_links.mock';
export type { MockEditorsServiceFactory } from './editors.mock';
export type { MockPlatformServiceFactory } from './platform.mock';
export type { MockUserPermissionsServiceFactory } from './permissions.mock';

export { docLinksServiceFactory } from './doc_links.mock';
export { editorsServiceFactory } from './editors.mock';
export { userPermissionsServiceFactory } from './permissions.mock';
export { platformServiceFactory } from './platform.mock';

/**
 * A factory function for creating a Jest-based implementation of `SharedUXServices`.
 */
export const mockServicesFactory: ServiceFactory<SharedUXServices> = () => ({
  platform: platformServiceFactory(),
  permissions: userPermissionsServiceFactory(),
  editors: editorsServiceFactory(),
  docLinks: docLinksServiceFactory(),
});

/**
 * A collection of mock Service Factories.
 */
export const mockServiceFactories = {
  servicesFactory: mockServicesFactory,
  docLinksServiceFactory,
  editorsServiceFactory,
  platformServiceFactory,
  userPermissionsServiceFactory,
};
