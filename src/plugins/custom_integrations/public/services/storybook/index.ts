/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegrationsServices } from '..';
import { findServiceFactory } from '../stub/find';
import { platformServiceFactory } from '../stub/platform';
import { PluginServiceFactory } from '../types';
import { CustomIntegrationsStartDependencies } from '../../types';

export { findServiceFactory } from '../stub/find';
export { platformServiceFactory } from '../stub/platform';

export const servicesFactory: PluginServiceFactory<
  CustomIntegrationsServices,
  CustomIntegrationsStartDependencies
> = (params) => ({
  find: findServiceFactory(params),
  platform: platformServiceFactory(params),
});
