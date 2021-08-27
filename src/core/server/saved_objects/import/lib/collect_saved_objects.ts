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
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { getObjKey } from '../../service/lib';
import { SavedObjectsImportFailure } from '../types';
import { SavedObjectsImportError } from '../errors';
import { getNonUniqueEntries } from './get_non_unique_entries';
import { createLimitStream } from './create_limit_stream';

export interface CollectSavedObjectsOptions {
  readStream: Readable;
  objectLimit: number;
  filter?: (obj: SavedObject) => boolean;
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
}

export interface CollectSavedObjectsResult {
  errors: SavedObjectsImportFailure[];
  importIdMap: Map<string, { id?: string; omitOriginId?: boolean }>;
  collectedObjects: Array<SavedObject<{ title?: string }>>;
}

export async function collectSavedObjects({
  readStream,
  objectLimit,
  filter,
  typeRegistry,
  namespace,
}: CollectSavedObjectsOptions): Promise<CollectSavedObjectsResult> {
  const supportedTypes = typeRegistry.getImportableAndExportableTypes().map((type) => type.name);

  const errors: SavedObjectsImportFailure[] = [];
  const entries: Array<{ type: string; id: string; namespaces?: string[] }> = [];
  const importIdMap = new Map<string, { id?: string; omitOriginId?: boolean }>();
  const collectedObjects: Array<SavedObject<{ title?: string }>> = await createPromiseFromStreams([
    readStream,
    createLimitStream(objectLimit),
    createFilterStream<SavedObject<{ title: string }>>((obj) => {
      entries.push({ type: obj.type, id: obj.id, namespaces: obj.namespaces });
      if (supportedTypes.includes(obj.type)) {
        return true;
      }
      const { title } = obj.attributes;
      errors.push({
        id: obj.id,
        type: obj.type,
        namespaces: obj.namespaces,
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
      // TODO: unsure what to be done for imports without namespaces info?
      importIdMap.set(getObjKey(obj, typeRegistry, namespace), {});
      // Ensure migrations execute on every saved object
      return Object.assign({ migrationVersion: {} }, obj);
    }),
    createConcatStream([]),
  ]);

  // throw a BadRequest error if we see the same import object type/id more than once
  const nonUniqueEntries = getNonUniqueEntries(entries, typeRegistry, namespace);
  if (nonUniqueEntries.length > 0) {
    throw SavedObjectsImportError.nonUniqueImportObjects(nonUniqueEntries);
  }

  return {
    errors,
    collectedObjects,
    importIdMap,
  };
}
