/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

export const CURRENT_MAPPINGS_FILE = Path.resolve(__dirname, '../current_mappings.json');

export async function readCurrentMappings(): Promise<SavedObjectsTypeMappingDefinitions> {
  let currentMappingsJson;
  try {
    currentMappingsJson = await Fsp.readFile(CURRENT_MAPPINGS_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }

  return JSON.parse(currentMappingsJson);
}

export async function updateCurrentMappings(newMappings: SavedObjectsTypeMappingDefinitions) {
  await Fsp.writeFile(CURRENT_MAPPINGS_FILE, JSON.stringify(newMappings, null, 2) + '\n', 'utf8');
}
