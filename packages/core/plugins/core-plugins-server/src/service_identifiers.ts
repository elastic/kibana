/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceIdentifier } from '@kbn/core-di-common';
import type { LoggerFactory } from '@kbn/logging';
import { PluginConfig } from './types';

/**
 * ServiceId for the logger that will be scoped to the current plugin.
 *
 * Similar to the logger exposed via {@link PluginInitializerContext.logger}
 */
export const loggerServiceId: ServiceIdentifier<LoggerFactory> = Symbol.for('pluginLogger');

/**
 * ServiceId for the plugin's configuration accessor.
 *
 * Similar to the config exposed via {@link PluginInitializerContext.config}
 */
export const configServiceId: ServiceIdentifier<PluginConfig> = Symbol.for('pluginConfig');
