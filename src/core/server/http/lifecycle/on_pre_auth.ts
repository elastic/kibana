/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
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

type OnPreAuthResult = Next;

const preAuthResult = {
  next(): OnPreAuthResult {
    return { type: ResultType.next };
  },
  isNext(result: OnPreAuthResult): result is Next {
    return result && result.type === ResultType.next;
  },
};

/**
 * @public
 * A tool set defining an outcome of OnPreAuth interceptor for incoming request.
 */
export interface OnPreAuthToolkit {
  /** To pass request to the next handler */
  next: () => OnPreAuthResult;
}

const toolkit: OnPreAuthToolkit = {
  next: preAuthResult.next,
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
 * incoming HTTP requests before a user has been authenticated.
 */
export function adoptToHapiOnPreAuth(fn: OnPreAuthHandler, log: Logger) {
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

      throw new Error(
        `Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return hapiResponseAdapter.toInternalError();
    }
  };
}
