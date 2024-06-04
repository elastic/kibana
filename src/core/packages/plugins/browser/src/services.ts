/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import type { PluginInitializerContext } from './plugin_initializer';

/**
 * The dependency injection token for the plugin opaque id.
 *
 * Similar to the value exposed via {@link PluginInitializerContext.opaqueId}
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
 * Service identifier for the plugin's configuration accessor.
 *
 * Similar to the config exposed via {@link PluginInitializerContext.config}
 */
export const ConfigService: interfaces.ServiceIdentifier<PluginInitializerContext['config']> =
  Symbol.for('ConfigService');

export const HttpService: interfaces.ServiceIdentifier<CoreStart['http']> =
  Symbol.for('HttpService');

export const HttpSetupService: interfaces.ServiceIdentifier<CoreSetup['http']> =
  Symbol.for('HttpSetupService');
