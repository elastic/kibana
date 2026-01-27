/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { CustomHostSettings, ProxySettings, SSLSettings } from './utils/types';
export { customHostSettingsSchema } from './utils/types';
export { getNodeSSLOptions, getSSLSettingsFromConfig } from './utils/get_node_ssl_options';
export { getCustomAgents } from './utils/get_custom_agents';
