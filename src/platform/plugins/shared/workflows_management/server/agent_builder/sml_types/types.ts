/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mirrors SML types from @kbn/semantic-layer-plugin/server/services/sml/types.
// Declared inline to avoid a circular TS project reference.

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';

export interface SmlChunk {
  type: string;
  content: string;
  title: string;
  permissions?: string[];
}

export interface SmlData {
  chunks: SmlChunk[];
}

export interface SmlContext {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface SmlListItem {
  id: string;
  updatedAt: string;
  spaces: string[];
}

export interface SmlTypeDefinition {
  id: string;
  list: (context: SmlContext) => AsyncIterable<SmlListItem[]>;
  getSmlData: (originId: string, context: SmlContext) => Promise<SmlData | undefined>;
  originType?: string;
  fetchFrequency?: () => string;
}
