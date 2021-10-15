/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  BaseDeprecationDetails,
  DeprecationsDetails,
  ConfigDeprecationDetails,
  FeatureDeprecationDetails,
  GetDeprecationsContext,
  RegisterDeprecationsConfig,
  DeprecationsGetResponse,
} from './types';

export type {
  DeprecationsServiceSetup,
  InternalDeprecationsServiceSetup,
  InternalDeprecationsServiceStart,
  DeprecationsClient,
} from './deprecations_service';

export { DeprecationsService } from './deprecations_service';
export { config } from './deprecation_config';
