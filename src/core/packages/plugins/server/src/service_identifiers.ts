/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { PluginInitializerContext } from './types';

/**
 * The dependency injection token for the plugin opaque id.
 *
 * Similar to the logger exposed via {@link PluginInitializerContext.opaqueId}
 */
export const OpaqueIdToken: interfaces.ServiceIdentifier<PluginInitializerContext['opaqueId']> =
  Symbol.for('PluginOpaqueId');

/**
 * Service identifier for the logger that will be scoped to the current plugin.
 *
 * Similar to the logger exposed via {@link PluginInitializerContext.logger}
 */
export const LoggerService: interfaces.ServiceIdentifier<PluginInitializerContext['logger']> =
  Symbol.for('LoggerService');

/**
 * Service identifier for the logging service setup that will be scoped to the current plugin.
 *
 * Similar to the logging exposed via {@link CoreSetup.logging}
 */
export const LoggingService: interfaces.ServiceIdentifier<CoreSetup['logging']> =
  Symbol.for('LoggingService');

/**
 * Service identifier for the plugin's configuration accessor.
 *
 * Similar to the config exposed via {@link PluginInitializerContext.config}
 */
export const ConfigService: interfaces.ServiceIdentifier<PluginInitializerContext['config']> =
  Symbol.for('ConfigService');

export const HttpService: interfaces.ServiceIdentifier<CoreSetup['http']> =
  Symbol.for('HttpService');
