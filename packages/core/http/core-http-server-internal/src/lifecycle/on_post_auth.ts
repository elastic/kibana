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
  OnPostAuthNextResult,
  OnPostAuthToolkit,
  OnPostAuthResult,
  OnPostAuthHandler,
} from '@kbn/core-http-server';
import { isKibanaResponse } from '@kbn/core-http-server';
import { OnPostAuthResultType } from '@kbn/core-http-server';
import {
  HapiResponseAdapter,
  CoreKibanaRequest,
  lifecycleResponseFactory,
} from '@kbn/core-http-router-server-internal';

const postAuthResult = {
  next(): OnPostAuthResult {
    return { type: OnPostAuthResultType.next };
  },
  isNext(result: OnPostAuthResult): result is OnPostAuthNextResult {
    return result && result.type === OnPostAuthResultType.next;
  },
};

const toolkit: OnPostAuthToolkit = {
  next: postAuthResult.next,
};

/**
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
      const result = await fn(CoreKibanaRequest.from(request), lifecycleResponseFactory, toolkit);
      if (isKibanaResponse(result)) {
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
