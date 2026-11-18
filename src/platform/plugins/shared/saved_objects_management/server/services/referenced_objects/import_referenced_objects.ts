/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsImporter, SavedObject } from '@kbn/core/server';
import { createListStream } from '@kbn/utils';
import { prettifyError } from '@kbn/zod';
import type { ApiBodyRegistry } from '../api_body_registry';
import type {
  ImportReferencedObjectsRequest,
  ImportReferencedObjectsResponse,
} from '../../../common/referenced_objects_schemas';

type ImportResult = ImportReferencedObjectsResponse['results'][number];

const toKey = ({ type, id }: { type: string; id: string }) => `${type}:${id}`;

/**
 * Imports API bodies through core's importer: each body is validated against its type's schema
 * and converted with `toStored`. Throws core's import errors, such as an exceeded size limit.
 */
export const importReferencedObjects = async ({
  importer,
  registry,
  objects,
  mode,
}: ImportReferencedObjectsRequest & {
  importer: ISavedObjectsImporter;
  registry: ApiBodyRegistry;
}): Promise<ImportReferencedObjectsResponse> => {
  const results = new Map<string, ImportResult>();
  const storedObjects: SavedObject[] = [];

  for (const { type, id, data } of objects) {
    const addError = (errorType: string, message: string): void => {
      results.set(toKey({ type, id }), {
        type,
        id,
        destination_id: id,
        status: 'error',
        error: { type: errorType, message },
      });
    };

    const entry = registry.get(type);
    if (!entry) {
      addError('unsupported_type', `Saved objects of type [${type}] can't be imported.`);
      continue;
    }

    const parsed = entry.getSchema().safeParse(data);
    if (!parsed.success) {
      addError('invalid_body', prettifyError(parsed.error));
      continue;
    }

    try {
      const { attributes, references } = entry.toStored(parsed.data);
      storedObjects.push({ type, id, attributes, references });
    } catch (e) {
      addError('transform_failed', e.message);
    }
  }

  if (storedObjects.length > 0) {
    const { successResults = [], errors = [] } = await importer.import({
      readStream: createListStream(storedObjects),
      overwrite: mode === 'overwrite',
      createNewCopies: false,
    });

    successResults.forEach(({ type, id, destinationId, overwrite }) => {
      results.set(toKey({ type, id }), {
        type,
        id,
        destination_id: destinationId ?? id,
        status: overwrite ? 'overwritten' : 'created',
      });
    });

    errors.forEach(({ type, id, error }) => {
      results.set(
        toKey({ type, id }),
        error.type === 'conflict'
          ? { type, id, destination_id: error.destinationId ?? id, status: 'conflict' }
          : {
              type,
              id,
              destination_id: id,
              status: 'error',
              error: { type: error.type, message: 'message' in error ? error.message : error.type },
            }
      );
    });
  }

  // One result per requested object, in request order.
  const orderedResults = objects.flatMap((object) => results.get(toKey(object)) ?? []);
  return {
    success: orderedResults.every(({ status }) => status !== 'conflict' && status !== 'error'),
    results: orderedResults,
    warnings: [],
  };
};
