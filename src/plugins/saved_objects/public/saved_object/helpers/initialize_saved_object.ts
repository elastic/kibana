/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, assign } from 'lodash';
import { SavedObjectsClientContract } from '@kbn/core/public';
import { SavedObject, SavedObjectConfig } from '../../types';

/**
 * Initialize saved object
 */
export async function intializeSavedObject(
  savedObject: SavedObject,
  savedObjectsClient: SavedObjectsClientContract,
  config: SavedObjectConfig
) {
  const esType = config.type;
  // ensure that the esType is defined
  if (!esType) throw new Error('You must define a type name to use SavedObject objects.');

  if (!savedObject.id) {
    // just assign the defaults and be done
    assign(savedObject, savedObject.defaults);
    await savedObject.hydrateIndexPattern!();
    if (typeof config.afterESResp === 'function') {
      savedObject = await config.afterESResp(savedObject);
    }
    return savedObject;
  }

  const resp = await savedObjectsClient.get(esType, savedObject.id);
  const respMapped = {
    _id: resp.id,
    _type: resp.type,
    _source: cloneDeep(resp.attributes),
    references: resp.references,
    found: !!resp._version,
  };
  await savedObject.applyESResp(respMapped);
  if (typeof config.init === 'function') {
    await config.init.call(savedObject);
  }

  return savedObject;
}
