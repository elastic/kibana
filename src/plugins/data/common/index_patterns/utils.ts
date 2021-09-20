/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexPatternSavedObjectAttrs } from './index_patterns';
import type { SavedObjectsClientCommon } from '../types';

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../constants';

/**
 * Returns an object matching a given title
 *
 * @param client {SavedObjectsClientCommon}
 * @param title {string}
 * @returns {Promise<SavedObject|undefined>}
 */
export async function findByTitle(client: SavedObjectsClientCommon, title: string) {
  if (title) {
    const savedObjects = await client.find<IndexPatternSavedObjectAttrs>({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      perPage: 10,
      search: `"${title}"`,
      searchFields: ['title'],
      fields: ['title'],
    });

    return savedObjects.find((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
  }
}
