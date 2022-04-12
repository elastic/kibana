/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SharedUxServices } from '../../types';

import { applicationServiceFactory } from './application.mock';
import { docLinksServiceFactory } from './doc_links.mock';
import { editorsServiceFactory } from './editors.mock';
import { httpServiceFactory } from './http.mock';
import { userPermissionsServiceFactory } from './permissions.mock';
import { platformServiceFactory } from './platform.mock';
import { dataServiceFactory, MockDataServiceFactoryConfig } from './data.mock';

export type { MockApplicationServiceFactory } from './application.mock';
export type { MockDocLinksServiceFactory } from './doc_links.mock';
export type { MockEditorsServiceFactory } from './editors.mock';
export type { MockHttpServiceFactory } from './http.mock';
export type { MockUserPermissionsServiceFactory } from './permissions.mock';
export type { MockPlatformServiceFactory } from './platform.mock';

export { applicationServiceFactory } from './application.mock';
export { docLinksServiceFactory } from './doc_links.mock';
export { editorsServiceFactory } from './editors.mock';
export { httpServiceFactory } from './http.mock';
export { userPermissionsServiceFactory } from './permissions.mock';
export { platformServiceFactory } from './platform.mock';
export { dataServiceFactory } from './data.mock';

export interface MockServicesFactoryConfig {
  config: MockDataServiceFactoryConfig;
}

/**
 * A factory function for creating a Jest-based implementation of `SharedUxServices`.
 */
export const mockServicesFactory: (params?: MockServicesFactoryConfig) => SharedUxServices = (
  params?: MockServicesFactoryConfig
) => ({
  application: applicationServiceFactory(),
  docLinks: docLinksServiceFactory(),
  editors: editorsServiceFactory(),
  http: httpServiceFactory(),
  permissions: userPermissionsServiceFactory(),
  platform: platformServiceFactory(),
  data: dataServiceFactory(params?.config),
});

/**
 * A collection of mock Service Factories.
 */
export const mockServiceFactories = {
  applicationServiceFactory,
  docLinksServiceFactory,
  editorsServiceFactory,
  httpServiceFactory,
  platformServiceFactory,
  userPermissionsServiceFactory,
  dataServiceFactory,
};
