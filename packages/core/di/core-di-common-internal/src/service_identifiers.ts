/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginOpaqueId, PluginName, PluginManifest } from '@kbn/core-base-common';
import type { ServiceIdentifier } from '@kbn/core-di-common';

/**
 * The service identifier for the plugin opaque id.
 * Only available on plugin container and children of them.
 * @internal should only be used for internal Core service.
 */
export const pluginOpaqueIdServiceId: ServiceIdentifier<PluginOpaqueId> =
  Symbol.for('pluginOpaqueId');

/**
 * The service identifier for the plugin opaque id.
 * Only available on plugin container and children of them.
 * @internal should only be used for internal Core service.
 */
export const pluginNameServiceId: ServiceIdentifier<PluginName> = Symbol.for('pluginName');

export const pluginManifestServiceId: ServiceIdentifier<PluginManifest> =
  Symbol.for('pluginManifest');
