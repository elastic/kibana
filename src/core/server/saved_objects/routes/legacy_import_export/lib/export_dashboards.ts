/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '../../../..';
import { collectReferencesDeep } from './collect_references_deep';

export async function exportDashboards(
  ids: string[],
  savedObjectsClient: SavedObjectsClientContract,
  kibanaVersion: string
) {
  const objectsToExport = ids.map((id) => ({ id, type: 'dashboard' }));

  const objects = await collectReferencesDeep(savedObjectsClient, objectsToExport);
  return {
    version: kibanaVersion,
    objects,
  };
}
