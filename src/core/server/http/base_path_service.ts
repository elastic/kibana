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
import { Request } from 'hapi';
import { KibanaRequest, toRawRequest } from './router';

import { modifyUrl } from '../../utils';

const getIncomingMessage = (request: KibanaRequest | Request) =>
  request instanceof KibanaRequest ? toRawRequest(request).raw.req : request.raw.req;

export class BasePath {
  private readonly basePathCache = new WeakMap<ReturnType<typeof getIncomingMessage>, string>();

  constructor(private readonly serverBasePath?: string) {}

  public get = (request: KibanaRequest | Request) => {
    const incomingMessage = getIncomingMessage(request);

    const requestScopePath = this.basePathCache.get(incomingMessage) || '';
    const serverBasePath = this.serverBasePath || '';
    return `${serverBasePath}${requestScopePath}`;
  };

  // should work only for KibanaRequest as soon as spaces migrate to NP
  public set = (request: KibanaRequest | Request, requestSpecificBasePath: string) => {
    const incomingMessage = getIncomingMessage(request);

    if (this.basePathCache.has(incomingMessage)) {
      throw new Error(
        'Request basePath was previously set. Setting multiple times is not supported.'
      );
    }
    this.basePathCache.set(incomingMessage, requestSpecificBasePath);
  };

  public prepend = (path: string): string => {
    if (!this.serverBasePath) return path;
    return modifyUrl(path, parts => {
      if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
        parts.pathname = `${this.serverBasePath}${parts.pathname}`;
      }
    });
  };

  public remove = (path: string): string => {
    if (!this.serverBasePath) {
      return path;
    }

    if (path === this.serverBasePath) {
      return '/';
    }

    if (path.startsWith(`${this.serverBasePath}/`)) {
      return path.slice(this.serverBasePath.length);
    }

    return path;
  };
}
