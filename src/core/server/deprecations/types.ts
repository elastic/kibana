/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '../saved_objects/types';

/**
 * @public
 */
export interface RegisterDeprecationsConfig {
  getDeprecations: (context: GetDeprecationsContext) => MaybePromise<DeprecationsDetails[]>;
}

/**
 * @public
 */
export interface GetDeprecationsContext {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
}
