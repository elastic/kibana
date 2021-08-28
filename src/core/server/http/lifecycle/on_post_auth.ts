/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import { Lifecycle } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import { KibanaRequest } from '../router/request';
import type { LifecycleResponseFactory } from '../router/response';
import { KibanaResponse, lifecycleResponseFactory } from '../router/response';
import { HapiResponseAdapter } from '../router/response_adapter';

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
