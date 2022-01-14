/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SharedUXServices } from '..';
import type { SharedUXPluginStartDeps } from '../../types';
import type { KibanaPluginServiceFactory } from '../types';
import { platformServiceFactory } from './platform';

/**
 * A factory function for creating a Kibana-based implementation of `SharedUXServices`.
 */
export const servicesFactory: KibanaPluginServiceFactory<
  SharedUXServices,
  SharedUXPluginStartDeps
> = (params) => ({
  platform: platformServiceFactory(params),
});
