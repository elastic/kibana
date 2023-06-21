/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SomeDevLog } from '@kbn/some-dev-log';
import { Client } from '@elastic/elasticsearch';
import { createFailError } from '@kbn/dev-cli-errors';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

const TEST_INDEX_NAME = '.kibana_mappings_check';

export async function checkIncompatibleMappings({
  log,
  esClient,
  currentMappings,
  nextMappings,
}: {
  log: SomeDevLog;
  esClient: Client;
  currentMappings: SavedObjectsTypeMappingDefinitions;
  nextMappings: SavedObjectsTypeMappingDefinitions;
}) {
  try {
    log.debug('creating index using current mappings...');
    await esClient.indices.create({
      index: TEST_INDEX_NAME,
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

    log.debug('attempting to update to new mappings...');
    const resp = await esClient.indices.putMapping({
      index: TEST_INDEX_NAME,
      properties: nextMappings,
    });

    log.success('Extracted mappings are compatible with existing mappings.');
    log.debug(`Got response:`, resp);
  } catch (error) {
    log.error('There was an issue trying to apply the extracted mappings to the existing index.');
    log.error(error);
    throw createFailError(
      `Only mappings changes that are compatible with current mappings are allowed. Consider reaching out to the Kibana core team if you are stuck.`
    );
  }
}
