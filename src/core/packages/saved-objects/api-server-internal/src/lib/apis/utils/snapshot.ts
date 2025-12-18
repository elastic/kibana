/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsSerializer, SavedObject } from '@kbn/core-saved-objects-server';
import {
  type SavedObjectsRawDoc,
  type SavedObjectsRawDocSource,
  type SavedObjectsSnapshotFilter,
  type SavedObjectsType,
} from '@kbn/core-saved-objects-server';
import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import flatten from 'flat';
import type { RepositoryEsClient } from '../../repository_es_client';
import type { ICommonHelper, IEncryptionHelper } from '../helpers';

export interface SavedObjectSnapshotDiff {
  stats: {
    total: number;
    additions: number;
    deletions: number;
    updates: number;
  };
  changedFields: Array<string>;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
}

/**
 * Returns a filtered diff of two JSON-equivalent objects
 * The diff contains a structure that helps convert one JSON object into the other.
 *
 * @param a first JSON object
 * @param b second JSON object
 * @param filter a nested filter of properties to keep in the diff output
 * @returns a [Diff] that helps convert one object into the other.
 */
export function diffDocSource(
  a?: SavedObjectsRawDocSource,
  b?: SavedObjectsRawDocSource,
  filter?: SavedObjectsSnapshotFilter
): SavedObjectSnapshotDiff {
  const result: SavedObjectSnapshotDiff = {
    stats: {
      total: 0,
      additions: 0,
      deletions: 0,
      updates: 0,
    },
    changedFields: [],
    oldValues: {},
    newValues: {},
  };

  // Flatten both objects and work out diff
  const stats = result.stats;
  const opts = { safe: true };
  const flatA = flatten(a ?? {}, opts) as Record<string, any>;
  const flatB = flatten(b ?? {}, opts) as Record<string, any>;
  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const flatFilter = (filter && (flatten(filter, opts) as Record<string, any>)) || undefined;
  // TODO: Might need better array comparison here though this works for now
  const arrayDeepEquals = (a1: any[] | ArrayBufferView, a2: any[] | ArrayBufferView) =>
    JSON.stringify(a1) === JSON.stringify(a2);
  // ElasticSearch source objects are JSON-equivalent data.
  // Object nesting is taken care of during flattening.
  // We need to take care of Arrays, TypedArrays and primitives
  // and ignore things deliberately excluded by JSON like functions and bigint
  const check = (v: any) => {
    switch (typeof v) {
      // eslint-disable-next-line prettier/prettier
      case 'number': case 'string': case 'boolean': return v;
      // eslint-disable-next-line prettier/prettier
      case 'object': return v; // -> Arrays, TypedArrays, Date
      // eslint-disable-next-line prettier/prettier
      case 'function': case 'symbol': case 'undefined': return undefined;
      // eslint-disable-next-line prettier/prettier
      case 'bigint': default: throw new TypeError('Please use JSON-compatible types');
    }
  };
  // We care about keys when:
  // - the filter is missing OR
  // - the key (or its parent/ancestor) is explicitly included
  const include = (key: string) =>
    !flatFilter || Object.entries(flatFilter).some(([k, v]) => key.includes(k) && v);
  for (const key of allKeys) {
    if (include(key)) {
      const valA = check(flatA[key]);
      const valB = check(flatB[key]);

      if (Array.isArray(valB) || ArrayBuffer.isView(valB)) {
        if (!arrayDeepEquals(valA, valB)) {
          if (valA === undefined) stats.additions++;
          else stats.updates++;
          result.oldValues[key] = valA;
          result.newValues[key] = valB;
        } else {
          // Array has not changed
          // So we're good.
        }
      } else if (valA !== valB) {
        // Remaining types are primitives, Date and `null`
        // all of which can be compared directly (as in valA === valB)
        if (valA === undefined) stats.additions++;
        else if (valB === undefined) stats.deletions++;
        else stats.updates++;
        result.oldValues[key] = valA;
        result.newValues[key] = valB;
      }
    }
  }

  // Gather stats, list of changed fields and return.
  result.stats.total = stats.additions + stats.deletions + stats.updates;
  result.changedFields = Object.keys(result.newValues);
  return result;
}

export async function processSingleSnapshot<T>(
  client: RepositoryEsClient,
  soB: SavedObject<T>,
  registryType: SavedObjectsType,
  commonHelper: ICommonHelper,
  serializerHelper: ISavedObjectsSerializer,
  encryptionHelper: IEncryptionHelper,
  updatedBy?: string,
  reason?: string
): Promise<IndexRequest | undefined> {
  // `B` is the object after changes
  // Hash encrypted attributes and get source
  const hashedSOB = await encryptionHelper.hashEncryptedAttributes(soB);
  const { _id, _source: b } = serializerHelper.savedObjectToRaw(hashedSOB);
  const type = registryType.name;
  const index = commonHelper.getIndexForType(type);
  // `A` is the original document in ES
  // Fetch it see if there is any difference
  let a: SavedObjectsRawDocSource | undefined;
  const docA = await client.get({ id: _id, index }, { ignore: [404] });
  if (docA.found) {
    const soA = serializerHelper.rawToSavedObject(docA as SavedObjectsRawDoc);
    const hashedSOA = await encryptionHelper.hashEncryptedAttributes(soA);
    a = serializerHelper.savedObjectToRaw(hashedSOA)._source;
  }
  const _diff = diffDocSource(a, b, registryType?.snapshotFilter);
  if (_diff.stats.total > 0) {
    // Diff detected
    const changeId = docA?._version ?? 0;
    const snapshotId = `${_id}:${changeId}`; // <-- deterministic id
    const timestamp = new Date().toISOString();
    const userId = updatedBy || 'unknown';
    const message = reason || 'unknown reason';

    // Queue up the diff+snapshot to process after saved object change
    return {
      id: snapshotId,
      index: commonHelper.getSnapshotIndexForType(type),
      document: {
        '@timestamp': timestamp,
        userId,
        message,
        changeId,
        objectId: _id,
        snapshotId,
        coreMigrationVersion: b?.coreMigrationVersion,
        changedFields: _diff.changedFields,
        oldValues: _diff.oldValues,
        newValues: _diff.newValues,
        snapshot: b,
      },
      require_alias: true,
    };
  }
}

// TODO: Use this on bulk calls.
export async function bulkGet(
  client: RepositoryEsClient,
  commonHelper: ICommonHelper,
  objects: { id: string; type: string }[]
) {
  const docs = objects.map((o) => {
    return {
      _id: o.id,
      _index: commonHelper.getIndexForType(o.type),
    };
  });
  const result = await client.mget({ docs }, { ignore: [404], meta: true });
  return result;
}
