/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { docLinksServiceFactory } from './doc_links.mock';

export type { MockPlatformServiceFactory } from './platform.mock';
export { platformServiceFactory } from './platform.mock';

import type { SharedUXServices } from '../.';
import { PluginServiceFactory } from '../types';
import { platformServiceFactory } from './platform.mock';
import { userPermissionsServiceFactory } from './permissions.mock';
import { editorsServiceFactory } from './editors.mock';
import { httpServiceFactory } from './http.mock';
import { applicationServiceFactory } from './application.mock';

/**
 * A factory function for creating a Jest-based implementation of `SharedUXServices`.
 */
export const servicesFactory: PluginServiceFactory<SharedUXServices> = () => ({
  platform: platformServiceFactory(),
  permissions: userPermissionsServiceFactory(),
  editors: editorsServiceFactory(),
  docLinks: docLinksServiceFactory(),
  http: httpServiceFactory(),
  application: applicationServiceFactory(),
});
