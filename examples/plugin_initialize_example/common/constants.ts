/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'pluginInitializeExample';
// The internal user (`kibana_system`) may only write to Kibana-owned indices, hence the `.kibana`
// prefix. The index is a stand-in for whatever Elasticsearch state a real `initialize()` sets up.
export const INDEX_NAME = '.kibana_plugin_initialize_example';
export const DOC_ID = 'default';
/** Gated by core: 503 until `initialize()` has succeeded on the instance serving the request. */
export const DOC_ROUTE = '/api/plugin_initialize_example/doc';
/** Gated like every route of this plugin's router, so once it answers it can only say `available`. */
export const STATUS_ROUTE = '/api/plugin_initialize_example/status';
/** Registered through `core.http.resources`, which core does not gate: answers while `initialize()` runs or has failed. */
export const HEALTH_PATH = '/plugin_initialize_example/health';
