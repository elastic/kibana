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
  OnPreAuthResult,
  OnPreAuthNextResult,
  OnPreAuthHandler,
  OnPreAuthToolkit,
} from '@kbn/core-http-server';
import { OnPreAuthResultType } from '@kbn/core-http-server';
import {
  FastifyResponseAdapter,
  CoreKibanaRequest,
  isKibanaResponse,
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
export function adoptToFastifyOnPreAuth(fn: OnPreAuthHandler, log: Logger) {
  return async function interceptPreAuthRequest(request: FastifyRequest, reply: FastifyReply) {
    const fastifyResponseAdapter = new FastifyResponseAdapter(reply);

    try {
      const result = await fn(
        CoreKibanaRequest.from(request, reply),
        lifecycleResponseFactory,
        toolkit
      );
      if (isKibanaResponse(result)) {
        fastifyResponseAdapter.handle(result);
        return;
      }

      if (preAuthResult.isNext(result)) {
        return;
      }

      throw new Error(
        `Unexpected result from OnPreAuth. Expected OnPreAuthResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      throw fastifyResponseAdapter.toInternalError();
    }
  };
}
