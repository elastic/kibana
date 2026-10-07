/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { PLUGIN_ID, INDEX_NAME, DOC_ID, DOC_ROUTE, STATUS_ROUTE, HEALTH_PATH } from './constants';
export type { PluginInitializeExampleDoc } from './types';
export { toStatusBody } from './status';
export type { InitState, InitStatusBody } from './status';
