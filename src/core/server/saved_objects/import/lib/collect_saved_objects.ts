/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import {
  createConcatStream,
  createFilterStream,
  createMapStream,
  createPromiseFromStreams,
} from '@kbn/utils';

import { SavedObject } from '../../types';
import { SavedObjectsImportFailure } from '../types';
import { SavedObjectsImportError } from '../errors';
import { getNonUniqueEntries } from './get_non_unique_entries';
import { createLimitStream } from './create_limit_stream';

interface CollectSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  filter?: (obj: SavedObject) => boolean;
  supportedTypes: string[];
}

export async function collectSavedObjects({
  readStream,
  objectLimit,
  filter,
  supportedTypes,
}: CollectSavedObjectsOptions) {
  const errors: SavedObjectsImportFailure[] = [];
  const entries: Array<{ type: string; id: string }> = [];
  const importIdMap = new Map<string, { id?: string; omitOriginId?: boolean }>();
  const collectedObjects: Array<SavedObject<{ title?: string }>> = await createPromiseFromStreams([
    readStream,
    createLimitStream(objectLimit),
    createFilterStream<SavedObject<{ title: string }>>((obj) => {
      entries.push({ type: obj.type, id: obj.id });
      if (supportedTypes.includes(obj.type)) {
        return true;
      }
      const { title } = obj.attributes;
      errors.push({
        id: obj.id,
        type: obj.type,
        title,
        meta: { title },
        error: {
          type: 'unsupported_type',
        },
      });
      return false;
    }),
    createFilterStream<SavedObject>((obj) => (filter ? filter(obj) : true)),
    createMapStream((obj: SavedObject) => {
      importIdMap.set(`${obj.type}:${obj.id}`, {});
      // Ensure migrations execute on every saved object
      return Object.assign({ migrationVersion: {} }, obj);
    }),
    createConcatStream([]),
  ]);

  // throw a BadRequest error if we see the same import object type/id more than once
  const nonUniqueEntries = getNonUniqueEntries(entries);
  if (nonUniqueEntries.length > 0) {
    throw SavedObjectsImportError.nonUniqueImportObjects(nonUniqueEntries);
  }

  return {
    errors,
    collectedObjects,
    importIdMap,
  };
}
