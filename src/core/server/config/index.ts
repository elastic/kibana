/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { coreDeprecationProvider } from './deprecation';

export {
  ConfigService,
  IConfigService,
  RawConfigService,
  RawConfigurationProvider,
  Config,
  ConfigPath,
  isConfigPath,
  hasConfigPathIntersection,
  ObjectToConfigAdapter,
  CliArgs,
  Env,
  ConfigDeprecation,
  ConfigDeprecationLogger,
  ConfigDeprecationProvider,
  ConfigDeprecationFactory,
  EnvironmentMode,
  PackageInfo,
  LegacyObjectToConfigAdapter,
} from '@kbn/config';
