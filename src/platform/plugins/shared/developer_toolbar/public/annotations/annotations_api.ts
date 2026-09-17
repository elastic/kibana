/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { buildPath, type IHttpFetchError, type ResponseErrorBody } from '@kbn/core-http-browser';
import {
  ANNOTATIONS_API_PATH,
  type Annotation,
  type AnnotationSnapshot,
  type AnnotationsApi,
  type AnnotationsExport,
  type AnnotationsImportResult,
} from '../../common/annotations';

/** Fetch errors carry the server's explanation (limits, rejected records) in their body; the layer shows it to the user. */
const explained = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    const message = (error as IHttpFetchError<ResponseErrorBody>).body?.message;
    throw message ? new Error(message) : error;
  }
};

export const createAnnotationsApi = (http: HttpSetup): AnnotationsApi => ({
  list: () => explained(http.get<Annotation[]>(ANNOTATIONS_API_PATH)),

  getSnapshot: (id) =>
    explained(
      http.get<AnnotationSnapshot>(buildPath(`${ANNOTATIONS_API_PATH}/{id}/snapshot`, { id }))
    ),

  create: (input) =>
    explained(http.post<Annotation>(ANNOTATIONS_API_PATH, { body: JSON.stringify(input) })),

  update: (id, patch) =>
    explained(
      http.patch<Annotation>(buildPath(`${ANNOTATIONS_API_PATH}/{id}`, { id }), {
        body: JSON.stringify(patch),
      })
    ),

  exportAll: () => explained(http.get<AnnotationsExport>(`${ANNOTATIONS_API_PATH}/export`)),

  importAll: (payload) =>
    explained(
      http.post<AnnotationsImportResult>(`${ANNOTATIONS_API_PATH}/import`, {
        body: JSON.stringify(payload),
      })
    ),
});
