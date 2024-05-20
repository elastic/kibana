/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core-http-server';
import type { HttpResources } from '@kbn/core-http-resources-server';

/**
 * Allows to configure HTTP response parameters
 * @internal
 */
export interface InternalHttpResourcesPreboot {
  createRegistrar(router: IRouter): HttpResources;
}

/**
 * Allows to configure HTTP response parameters
 * @internal
 */
export type InternalHttpResourcesSetup = InternalHttpResourcesPreboot;
