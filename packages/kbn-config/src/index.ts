/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  ConfigDeprecationFactory,
  AddConfigDeprecation,
  ConfigDeprecationProvider,
  ConfigDeprecationWithContext,
  ConfigDeprecation,
  ConfigDeprecationCommand,
  ConfigDeprecationContext,
  ChangedDeprecatedPaths,
} from './deprecation';

export { applyDeprecations, configDeprecationFactory } from './deprecation';

export type { RawConfigurationProvider, RawConfigAdapter } from './raw';
export { RawConfigService, getConfigFromFiles } from './raw';

export type { IConfigService, ConfigValidateParameters } from './config_service';
export { ConfigService } from './config_service';
export type { Config, ConfigPath } from './config';
export { isConfigPath, hasConfigPathIntersection } from './config';
export { ObjectToConfigAdapter } from './object_to_config_adapter';
export type { CliArgs, RawPackageInfo } from './env';
export { Env } from './env';
export type { EnvironmentMode, PackageInfo } from './types';
export { getPluginSearchPaths } from './plugins';
