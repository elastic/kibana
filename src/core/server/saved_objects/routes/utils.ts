/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Readable } from 'stream';
import { SavedObject, SavedObjectsExportResultDetails } from 'src/core/server';
import {
  createSplitStream,
  createMapStream,
  createFilterStream,
  createPromiseFromStreams,
  createListStream,
  createConcatStream,
} from '@kbn/utils';

export async function createSavedObjectsStreamFromNdJson(ndJsonStream: Readable) {
  const savedObjects = await createPromiseFromStreams([
    ndJsonStream,
    createSplitStream('\n'),
    createMapStream((str: string) => {
      if (str && str.trim() !== '') {
        return JSON.parse(str);
      }
    }),
    createFilterStream<SavedObject | SavedObjectsExportResultDetails>(
      (obj) => !!obj && !(obj as SavedObjectsExportResultDetails).exportedCount
    ),
    createConcatStream([]),
  ]);
  return createListStream(savedObjects);
}

export function validateTypes(types: string[], supportedTypes: string[]): string | undefined {
  const invalidTypes = types.filter((t) => !supportedTypes.includes(t));
  if (invalidTypes.length) {
    return `Trying to export non-exportable type(s): ${invalidTypes.join(', ')}`;
  }
}

export function validateObjects(
  objects: Array<{ id: string; type: string }>,
  supportedTypes: string[]
): string | undefined {
  const invalidObjects = objects.filter((obj) => !supportedTypes.includes(obj.type));
  if (invalidObjects.length) {
    return `Trying to export object(s) with non-exportable types: ${invalidObjects
      .map((obj) => `${obj.type}:${obj.id}`)
      .join(', ')}`;
  }
}
