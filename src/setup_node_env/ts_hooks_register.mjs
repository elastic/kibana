/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal ESM preload script that registers Kibana's TypeScript resolve hooks.
 *
 * Usage: node --import ./src/setup_node_env/ts_hooks_register.mjs ...
 *
 * This is used for subprocesses (e.g. Vite builds) that need the same
 * .js → .ts resolution and extensionless-import handling that the main
 * Kibana process gets via setup_node_env/index.js.
 */

import { register } from 'node:module';

register('./ts_resolve_hooks.mjs', import.meta.url);
