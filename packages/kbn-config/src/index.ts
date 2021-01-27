/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export {
  applyDeprecations,
  ConfigDeprecation,
  ConfigDeprecationFactory,
  configDeprecationFactory,
  ConfigDeprecationLogger,
  ConfigDeprecationProvider,
  ConfigDeprecationWithContext,
  copyFromRoot,
} from './deprecation';

export { RawConfigurationProvider, RawConfigService, getConfigFromFiles } from './raw';

export { ConfigService, IConfigService } from './config_service';
export { Config, ConfigPath, isConfigPath, hasConfigPathIntersection } from './config';
export { ObjectToConfigAdapter } from './object_to_config_adapter';
export { CliArgs, Env, RawPackageInfo } from './env';
export { EnvironmentMode, PackageInfo } from './types';
export { LegacyObjectToConfigAdapter, LegacyLoggingConfig } from './legacy';
export { getPluginSearchPaths } from './plugins';
