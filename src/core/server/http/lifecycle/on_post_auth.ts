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
}

interface Next {
  type: ResultType.next;
}

type OnPostAuthResult = Next;

const postAuthResult = {
  next(): OnPostAuthResult {
    return { type: ResultType.next };
  },
  isNext(result: OnPostAuthResult): result is Next {
    return result && result.type === ResultType.next;
  },
};

/**
 * @public
 * A tool set defining an outcome of OnPostAuth interceptor for incoming request.
 */
export interface OnPostAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPostAuthResult;
}

/**
 * See {@link OnPostAuthToolkit}.
 * @public
 */
export type OnPostAuthHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: OnPostAuthToolkit
) => OnPostAuthResult | KibanaResponse | Promise<OnPostAuthResult | KibanaResponse>;

const toolkit: OnPostAuthToolkit = {
  next: postAuthResult.next,
};

/**
 * @public
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnPostAuthFormat(fn: OnPostAuthHandler, log: Logger) {
  return async function interceptRequest(
    request: Request,
    responseToolkit: HapiResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);
    try {
      const result = await fn(KibanaRequest.from(request), lifecycleResponseFactory, toolkit);
      if (result instanceof KibanaResponse) {
        return hapiResponseAdapter.handle(result);
      }
      if (postAuthResult.isNext(result)) {
        return responseToolkit.continue;
      }

      throw new Error(
        `Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return hapiResponseAdapter.toInternalError();
    }
  };
}
