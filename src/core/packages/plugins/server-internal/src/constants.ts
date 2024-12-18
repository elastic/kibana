/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @internal
 */
export const ENABLE_ALL_PLUGINS_CONFIG_PATH = 'forceEnableAllPlugins' as const;

/**
 * Set this to true in the raw configuration passed to {@link Root} to force
 * enable all plugins.
 * @internal
 */
export const PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH =
  `plugins.${ENABLE_ALL_PLUGINS_CONFIG_PATH}` as const;
