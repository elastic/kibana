/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IScopedClusterClient, SavedObjectsClientContract } from '../../server';

export interface PluginDeprecationDetails extends DeprecationsDetails {
  pluginId: string;
}

export interface DeprecationsDetails {
  message: string;
  level: 'warning' | 'critical';
  documentationUrl?: string;
  correctionActions: {
    api?: {
      path: string;
      method: 'POST' | 'PUT';
      body?: {
        [key: string]: any;
      };
    };
    manualSteps?: string[];
  };
}

export interface DeprecationsContext {
  getDeprecations: (
    dependencies: GetDeprecationsDependencies
  ) => MaybePromise<DeprecationsDetails[]>;
}

interface GetDeprecationsDependencies {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}

type MaybePromise<T> = T | Promise<T>;
