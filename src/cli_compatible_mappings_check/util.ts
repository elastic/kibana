/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { Client } from '@elastic/elasticsearch';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';

export const CURRENT_MAPPINGS_FILE = path.join(__dirname, 'current_mappings.json');
export function writeToMappingsFile(mappings: SavedObjectsTypeMappingDefinitions) {
  fs.writeFileSync(CURRENT_MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

export const log = new ToolingLog({
  level: 'verbose',
  writeTo: process.stdout,
});

export function exit(code: number) {
  setTimeout(() => {
    process.exit(code);
  }, 0);
}

export async function checkIfMappingsAreIncompatible({
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

export async function startES(): Promise<Client> {
  const servers = createTestServers({ adjustTimeout: () => {} });
  const esServer = await servers.startES();
  return (esServer.es as any).getClient();
}
