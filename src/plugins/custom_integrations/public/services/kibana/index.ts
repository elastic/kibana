/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationsServices } from '..';
import { CustomIntegrationsStartDependencies } from '../../types';
import { KibanaPluginServiceFactory } from '../types';

import { findServiceFactory } from './find';
import { platformServiceFactory } from './platform';

export { findServiceFactory } from './find';
export { platformServiceFactory } from './platform';

export const servicesFactory: KibanaPluginServiceFactory<
  CustomIntegrationsServices,
  CustomIntegrationsStartDependencies
> = (params) => ({
  find: findServiceFactory(params),
  platform: platformServiceFactory(params),
});
