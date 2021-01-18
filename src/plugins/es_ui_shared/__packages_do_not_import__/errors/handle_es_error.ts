/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
