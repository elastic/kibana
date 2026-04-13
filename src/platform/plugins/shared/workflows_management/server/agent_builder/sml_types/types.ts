/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mirrors SML types from @kbn/agent-builder-plugin/server/services/sml/types.
// Declared inline to avoid a circular TS project reference: agent_builder already
// references workflows_management (via agent-builder-genai-utils), so a reverse
// import would create a build cycle.

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
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
  request?: KibanaRequest;
}

export interface SmlToAttachmentContext {
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
}

export interface SmlListItem {
  id: string;
  updatedAt: string;
  spaces: string[];
}

export interface SmlDocument {
  id: string;
  type: string;
  title: string;
  origin_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  spaces: string[];
  permissions: string[];
}

export interface SmlTypeDefinition {
  id: string;
  list: (context: SmlContext) => AsyncIterable<SmlListItem[]>;
  getSmlData: (originId: string, context: SmlContext) => Promise<SmlData | undefined>;
  toAttachment: (
    item: SmlDocument,
    context: SmlToAttachmentContext
  ) => Promise<AttachmentInput<string, unknown> | undefined>;
  fetchFrequency?: () => string;
}
