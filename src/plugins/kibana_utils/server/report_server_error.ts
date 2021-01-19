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

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { KibanaResponseFactory } from 'kibana/server';
import { KbnError, KibanaServerError } from '../common';

export class KbnServerError extends KbnError {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export function getErrorResponseInfo(err: any): KibanaServerError {
  let rootCause;
  // Forward the cause of an Elasticsearch initiated error
  if (err instanceof ResponseError) {
    rootCause = err.body.error;
  }
  return {
    statusCode: err.statusCode ?? 500,
    message: err.message,
    attributes: rootCause,
  };
}

export function reportServerError(res: KibanaResponseFactory, err: any) {
  const errParams = getErrorResponseInfo(err);
  const { statusCode, ...rest } = errParams;
  return res.customError({
    statusCode,
    body: rest,
  });
}
