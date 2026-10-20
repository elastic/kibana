/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'pluginInitializeExampleConsumer';
/** The required dependency whose `initialize()` this plugin observes and waits for. */
export const DEPENDENCY_ID = 'pluginInitializeExample';
/** Calls the dependency's `getDoc()`, which waits for the dependency's own `initialize()`. */
export const DOC_ROUTE = '/api/plugin_initialize_example_consumer/doc';
/** This plugin's and the dependency's initialization status; never triggers anything. */
export const STATUS_ROUTE = '/api/plugin_initialize_example_consumer/status';
/** Waits for the dependency through `core.plugins.initializePlugin()`, honoring its backoff. */
export const INITIALIZE_ROUTE = '/api/plugin_initialize_example_consumer/initialize';
