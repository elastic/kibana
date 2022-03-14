/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SharedUXServices } from '../.';
import { PluginServiceFactory } from '../types';
import { platformServiceFactory } from './platform';
import { editorsServiceFactory } from './editors';
import { userPermissionsServiceFactory } from './permissions';
import { docLinksServiceFactory } from './doc_links';
import { httpServiceFactory } from './http';
import { applicationServiceFactory } from './application';

/**
 * A factory function for creating a Storybook-based implementation of `SharedUXServices`.
 */
export const servicesFactory: PluginServiceFactory<SharedUXServices, {}> = (params) => ({
  platform: platformServiceFactory(params),
  permissions: userPermissionsServiceFactory(),
  editors: editorsServiceFactory(),
  docLinks: docLinksServiceFactory(),
  http: httpServiceFactory(params),
  application: applicationServiceFactory(),
});
