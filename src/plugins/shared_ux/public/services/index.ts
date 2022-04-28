/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SharedUxServices } from '@kbn/shared-ux-services';

import type { SharedUXPluginStartDeps } from '../types';
import type { KibanaPluginServiceFactory } from './types';

import { platformServiceFactory } from './platform';
import { userPermissionsServiceFactory } from './permissions';
import { editorsServiceFactory } from './editors';
import { docLinksServiceFactory } from './doc_links';
import { httpServiceFactory } from './http';
import { applicationServiceFactory } from './application';
import { dataServiceFactory } from './data';

/**
 * A factory function for creating a Kibana-based implementation of `SharedUXServices`.
 */
export const servicesFactory: KibanaPluginServiceFactory<
  SharedUxServices,
  SharedUXPluginStartDeps
> = (params) => ({
  platform: platformServiceFactory(params),
  permissions: userPermissionsServiceFactory(params),
  editors: editorsServiceFactory(params),
  docLinks: docLinksServiceFactory(params),
  http: httpServiceFactory(params),
  application: applicationServiceFactory(params),
  data: dataServiceFactory(params),
});
