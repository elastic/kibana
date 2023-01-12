/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

export async function throwIfMappingsAreIncompatible({
  esClient,
  index,
  currentMappings,
  nextMappings,
}: {
  esClient: Client;
  index: string;
  currentMappings: SavedObjectsTypeMappingDefinitions;
  nextMappings: SavedObjectsTypeMappingDefinitions;
}) {
  await esClient.indices.create({
    index,
    mappings: {
      dynamic: false,
      properties: currentMappings,
    },
    settings: {
      mapping: {
        total_fields: { limit: 1500 },
      },
    },
  });

  return await esClient.indices.putMapping({
    index,
    properties: nextMappings,
  });
}
