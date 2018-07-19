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

// TODO Needs _some_ work
export type StatusCode = 200 | 202 | 204 | 400;

export class KibanaResponse<T> {
  constructor(readonly status: StatusCode, readonly payload?: T) {}
}

export const responseFactory = {
  accepted: <T extends { [key: string]: any }>(payload: T) => new KibanaResponse(202, payload),
  badRequest: <T extends Error>(err: T) => new KibanaResponse(400, err),
  noContent: () => new KibanaResponse<void>(204),
  ok: <T extends { [key: string]: any }>(payload: T) => new KibanaResponse(200, payload),
};

export type ResponseFactory = typeof responseFactory;
