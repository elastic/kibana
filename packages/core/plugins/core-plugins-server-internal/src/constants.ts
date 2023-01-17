/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Set this to true in the raw configuration passed to {@link Root} to force
 * enable all plugins.
 *
 * Intended for internal use only.
 * @internal
 */
export const PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH =
  'plugins.__internal__.enableAllPlugins' as const;
