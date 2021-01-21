/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ApiError } from '@elastic/elasticsearch';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { IKibanaResponse, KibanaResponseFactory } from 'kibana/server';

interface EsErrorHandlerParams {
  error: ApiError;
  response: KibanaResponseFactory;
}

/*
 * For errors returned by the new elasticsearch js client.
 */
export const handleEsError = ({ error, response }: EsErrorHandlerParams): IKibanaResponse => {
  // error.name is slightly better in terms of performance, since all errors now have name property
  if (error.name === 'ResponseError') {
    const { statusCode, body } = error as ResponseError;
    return response.customError({
      statusCode,
      body: { message: body.error?.reason },
    });
  }
  // Case: default
  return response.internalError({ body: error });
};
