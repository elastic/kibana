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
  DeprecatedConfigDetails,
  ConfigDeprecationWithContext,
  ConfigDeprecation,
  ConfigDeprecationCommand,
  ConfigDeprecationContext,
  ChangedDeprecatedPaths,
} from './src/deprecation';

export { applyDeprecations, configDeprecationFactory } from './src/deprecation';

export type { RawConfigurationProvider, RawConfigAdapter } from './src/raw';
export { RawConfigService, getConfigFromFiles } from './src/raw';

export type { IConfigService, ConfigValidateParameters } from './src/config_service';
export { ConfigService } from './src/config_service';
export type { Config, ConfigPath } from './src/config';
export { isConfigPath, hasConfigPathIntersection } from './src/config';
export { ObjectToConfigAdapter } from './src/object_to_config_adapter';
export type { CliArgs, RawPackageInfo, EnvOptions } from './src/env';
export { Env } from './src/env';
export type { EnvironmentMode, PackageInfo } from './src/types';
