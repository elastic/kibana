/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import {
  createSplitStream,
  createMapStream,
  createFilterStream,
  createPromiseFromStreams,
  createListStream,
  createConcatStream,
} from '@kbn/utils';
import Boom from '@hapi/boom';
import { RequestHandlerWrapper, SavedObject, SavedObjectsExportResultDetails } from '../..';

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
      (obj) => !!obj && (obj as SavedObjectsExportResultDetails).exportedCount === undefined
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

/**
 * Catches errors thrown by saved object route handlers and returns an error
 * with the payload and statusCode of the boom error.
 *
 * This is very close to the core `router.handleLegacyErrors` except that it
 * throws internal errors (statusCode: 500) so that the internal error's
 * message get logged by Core.
 *
 * TODO: Remove once https://github.com/elastic/kibana/issues/65291 is fixed.
 */
export const catchAndReturnBoomErrors: RequestHandlerWrapper = (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode !== 500) {
        return response.customError({
          body: e.output.payload,
          statusCode: e.output.statusCode,
          headers: e.output.headers as { [key: string]: string },
        });
      }
      throw e;
    }
  };
};
