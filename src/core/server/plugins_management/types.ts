/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface PluginDescriptor {
  pluginName: string;
  source: 'external' | 'verified';
  version: string;
  // new version is available (8.3.1)
  upgradeTarget?: string;
  upgradeAvailable?: boolean;
}

export interface AllowedPluginSource {
  name: string;
  displayName: string;
}
