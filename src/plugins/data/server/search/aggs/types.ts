/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ElasticsearchClient } from '../../../../../core/server/elasticsearch/client/types';
import type { SavedObjectsClientContract } from '../../../../../core/server/saved_objects/types';
import type { AggsCommonSetup, AggsStart as Start } from '../../../common/search/aggs/types';

export type AggsSetup = AggsCommonSetup;

export interface AggsStart {
  asScopedToClient: (
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) => Promise<Start>;
}
