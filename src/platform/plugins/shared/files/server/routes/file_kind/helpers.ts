/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IKibanaResponse, kibanaResponseFactory } from '@kbn/core/server';
import type { File } from '../../../common';
import { errors, FileServiceStart } from '../../file_service';

type ResultOrHttpError =
  | { result: File; error?: undefined }
  | { result?: undefined; error: IKibanaResponse };

/**
 * A helper that given an ID will return a file or map errors to an http response.
 */
export async function getById(
  fileService: FileServiceStart,
  id: string,
  fileKind: string
): Promise<ResultOrHttpError> {
  let result: undefined | File;
  try {
    result = await fileService.getById({ id });
  } catch (e) {
    let error: undefined | IKibanaResponse;
    if (e instanceof errors.FileNotFoundError) {
      error = kibanaResponseFactory.notFound({ body: { message: e.message } });
    } else {
      error = kibanaResponseFactory.custom({ statusCode: 500, body: { message: e.message } });
    }
    return { error };
  }

  return { result };
}
