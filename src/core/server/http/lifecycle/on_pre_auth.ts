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

import { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from 'hapi';
import { Logger } from '../../logging';
import {
  HapiResponseAdapter,
  KibanaRequest,
  KibanaResponse,
  lifecycleResponseFactory,
  LifecycleResponseFactory,
} from '../router';

enum ResultType {
  next = 'next',
  rewriteUrl = 'rewriteUrl',
}

interface Next {
  type: ResultType.next;
}

interface RewriteUrl {
  type: ResultType.rewriteUrl;
  url: string;
}

type OnPreAuthResult = Next | RewriteUrl;

const preAuthResult = {
  next(): OnPreAuthResult {
    return { type: ResultType.next };
  },
  rewriteUrl(url: string): OnPreAuthResult {
    return { type: ResultType.rewriteUrl, url };
  },
  isNext(result: OnPreAuthResult): result is Next {
    return result && result.type === ResultType.next;
  },
  isRewriteUrl(result: OnPreAuthResult): result is RewriteUrl {
    return result && result.type === ResultType.rewriteUrl;
  },
};

/**
 * @public
 * A tool set defining an outcome of OnPreAuth interceptor for incoming request.
 */
export interface OnPreAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPreAuthResult;
  /** Rewrite requested resources url before is was authenticated and routed to a handler */
  rewriteUrl: (url: string) => OnPreAuthResult;
}

const toolkit: OnPreAuthToolkit = {
  next: preAuthResult.next,
  rewriteUrl: preAuthResult.rewriteUrl,
};

/**
 * See {@link OnPreAuthToolkit}.
 * @public
 */
export type OnPreAuthHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: OnPreAuthToolkit
) => OnPreAuthResult | KibanaResponse | Promise<OnPreAuthResult | KibanaResponse>;

/**
 * @public
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnPreAuthFormat(fn: OnPreAuthHandler, log: Logger) {
  return async function interceptPreAuthRequest(
    request: Request,
    responseToolkit: HapiResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);

    try {
      const result = await fn(KibanaRequest.from(request), lifecycleResponseFactory, toolkit);
      if (result instanceof KibanaResponse) {
        return hapiResponseAdapter.handle(result);
      }

      if (preAuthResult.isNext(result)) {
        return responseToolkit.continue;
      }

      if (preAuthResult.isRewriteUrl(result)) {
        const { url } = result;
        request.setUrl(url);
        // We should update raw request as well since it can be proxied to the old platform
        request.raw.req.url = url;
        return responseToolkit.continue;
      }
      throw new Error(
        `Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return hapiResponseAdapter.toInternalError();
    }
  };
}
