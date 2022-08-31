/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  InternalDeprecationsServiceSetup,
  InternalDeprecationsServiceStart,
} from './deprecations_service';

export { DeprecationsService } from './deprecations_service';
export { config } from './deprecation_config';
export { CoreDeprecationsRouteHandlerContext } from './deprecations_route_handler_context';
