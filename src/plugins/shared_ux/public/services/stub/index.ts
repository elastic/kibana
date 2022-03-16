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
import { userPermissionsServiceFactory } from './permissions';
import { editorsServiceFactory } from './editors';
import { docLinksServiceFactory } from './doc_links';
import { httpServiceFactory } from './http';
import { applicationServiceFactory } from './application';

/**
 * A factory function for creating a simple stubbed implemetation of `SharedUXServices`.
 */
export const servicesFactory: PluginServiceFactory<SharedUXServices> = () => ({
  platform: platformServiceFactory(),
  permissions: userPermissionsServiceFactory(),
  editors: editorsServiceFactory(),
  docLinks: docLinksServiceFactory(),
  http: httpServiceFactory(),
  application: applicationServiceFactory(),
});
