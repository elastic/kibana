/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IScopedClusterClient, SavedObjectsClientContract } from 'src/core/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeprecationsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeprecationsPluginStart {}

export interface DeprecationDependencies {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface DeprecationInfo {
  message: string;
  level: 'warning' | 'critical';
  documentationUrl?: string;
  correctionAction?: () => void;
}
export interface DeprecationContext {
  pluginId: string;
  getDeprecations: Promise<DeprecationInfo>;
}
