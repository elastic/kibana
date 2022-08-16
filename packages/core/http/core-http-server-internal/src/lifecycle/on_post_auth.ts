/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from '@kbn/logging';
import type {
  OnPostAuthNextResult,
  OnPostAuthToolkit,
  OnPostAuthResult,
  OnPostAuthHandler,
} from '@kbn/core-http-server';
import { OnPostAuthResultType } from '@kbn/core-http-server';
import {
  FastifyResponseAdapter,
  CoreKibanaRequest,
  lifecycleResponseFactory,
  isKibanaResponse,
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
export function adoptToFastifyOnPostAuthFormat(fn: OnPostAuthHandler, log: Logger) {
  return async function interceptRequest(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const hapiResponseAdapter = new FastifyResponseAdapter(reply);
    try {
      const result = await fn(
        CoreKibanaRequest.from(request, reply),
        lifecycleResponseFactory,
        toolkit
      );
      if (isKibanaResponse(result)) {
        hapiResponseAdapter.handle(result);
        return;
      }
      if (postAuthResult.isNext(result)) {
        return;
      }

      throw new Error(
        `Unexpected result from OnPostAuth. Expected OnPostAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      throw hapiResponseAdapter.toInternalError();
    }
  };
}
