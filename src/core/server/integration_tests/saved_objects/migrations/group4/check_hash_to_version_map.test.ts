/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file contains logic to build and diff the index mappings for a migration.
 */

import crypto from 'crypto';
import { mapValues } from 'lodash';
import {
  getLatestMappingsVirtualVersionMap,
  HASH_TO_VERSION_MAP,
} from '@kbn/core-saved-objects-base-server-internal';
import { buildTypesMappings } from '@kbn/core-saved-objects-migration-server-internal';
import { getCurrentVersionTypeRegistry } from '../kibana_migrator_test_kit';

describe('transition from md5 hashes to model versions', () => {
  // this short-lived test is here to ensure no changes are introduced after the creation of the HASH_TO_VERSION_MAP
  it('ensures the hashToVersionMap does not miss any mappings changes', async () => {
    const typeRegistry = await getCurrentVersionTypeRegistry({ oss: false });
    const mappingProperties = buildTypesMappings(typeRegistry.getAllTypes());
    const hashes = md5Values(mappingProperties);
    const versions = getLatestMappingsVirtualVersionMap(typeRegistry.getAllTypes());

    const currentHashToVersionMap = Object.entries(hashes).reduce<Record<string, string>>(
      (acc, [type, hash]) => {
        acc[`${type}|${hash}`] = versions[type];
        return acc;
      },
      {}
    );

    expect(currentHashToVersionMap).toEqual(HASH_TO_VERSION_MAP);
  });
});

// Convert an object to an md5 hash string, using a stable serialization (canonicalStringify)
function md5Object(obj: any) {
  return crypto.createHash('md5').update(canonicalStringify(obj)).digest('hex');
}

// JSON.stringify is non-canonical, meaning the same object may produce slightly
// different JSON, depending on compiler optimizations (e.g. object keys
// are not guaranteed to be sorted). This function consistently produces the same
// string, if passed an object of the same shape. If the outpuf of this function
// changes from one release to another, migrations will run, so it's important
// that this function remains stable across releases.
function canonicalStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify)}]`;
  }

  if (!obj || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  const keys = Object.keys(obj);

  // This is important for properly handling Date
  if (!keys.length) {
    return JSON.stringify(obj);
  }

  const sortedObj = keys
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}: ${canonicalStringify(obj[k])}`);

  return `{${sortedObj}}`;
}

// Convert an object's values to md5 hash strings
function md5Values(obj: any) {
  return mapValues(obj, md5Object);
}
