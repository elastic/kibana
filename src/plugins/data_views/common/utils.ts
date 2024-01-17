/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PersistenceAPI } from './types';

/**
 * Returns an object matching a given name
 *
 * @param client {SavedObjectsClientCommon}
 * @param name {string}
 * @returns {SavedObject|undefined}
 */
export async function findByName(client: PersistenceAPI, name: string) {
  if (name) {
    const savedObjects = await client.find({
      perPage: 10,
      search: `"${name}"`,
      searchFields: ['name.keyword'],
      fields: ['name'],
    });

    return savedObjects ? savedObjects[0] : undefined;
  }
}

export function unwrapEtag(ifNoneMatch: string) {
  let requestHash = ifNoneMatch.replace(/^"(.+)"$/, '$1');
  if (requestHash.indexOf('-') > -1) {
    requestHash = requestHash.split('-')[0];
  }
  return requestHash;
}
