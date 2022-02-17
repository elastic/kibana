/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { coreDeprecationProvider } from './deprecation';
export { ensureValidConfiguration } from './ensure_valid_configuration';

export {
  ConfigService,
  isConfigPath,
  hasConfigPathIntersection,
  Env,
  ObjectToConfigAdapter,
  RawConfigService,
} from '@kbn/config';

export type {
  IConfigService,
  RawConfigurationProvider,
  Config,
  ConfigPath,
  CliArgs,
  ConfigDeprecation,
  ConfigDeprecationContext,
  AddConfigDeprecation,
  ConfigDeprecationProvider,
  ConfigDeprecationFactory,
  EnvironmentMode,
  PackageInfo,
} from '@kbn/config';
