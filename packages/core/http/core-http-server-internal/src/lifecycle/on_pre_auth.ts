/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type {
  OnPreAuthResult,
  OnPreAuthNextResult,
  OnPreAuthHandler,
  OnPreAuthToolkit,
} from '@kbn/core-http-server';
import { isKibanaResponse } from '@kbn/core-http-server';
import { OnPreAuthResultType } from '@kbn/core-http-server';
import {
  HapiResponseAdapter,
  CoreKibanaRequest,
  lifecycleResponseFactory,
} from '@kbn/core-http-router-server-internal';

const preAuthResult = {
  next(): OnPreAuthResult {
    return { type: OnPreAuthResultType.next };
  },
  isNext(result: OnPreAuthResult): result is OnPreAuthNextResult {
    return result && result.type === OnPreAuthResultType.next;
  },
};

const toolkit: OnPreAuthToolkit = {
  next: preAuthResult.next,
};

/**
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
      const result = await fn(CoreKibanaRequest.from(request), lifecycleResponseFactory, toolkit);
      if (isKibanaResponse(result)) {
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
