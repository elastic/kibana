/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { onRequestAsyncHookHandler } from 'fastify';
import type { Logger } from '@kbn/logging';
import type {
  KibanaRequestState,
  OnPreRoutingToolkit,
  OnPreRoutingResultRewriteUrl,
  OnPreRoutingResultNext,
  OnPreRoutingResult,
  OnPreRoutingHandler,
} from '@kbn/core-http-server';
import { OnPreRoutingResultType } from '@kbn/core-http-server';
import {
  FastifyResponseAdapter,
  CoreKibanaRequest,
  isKibanaResponse,
  lifecycleResponseFactory,
} from '@kbn/core-http-router-server-internal';

const preRoutingResult = {
  next(): OnPreRoutingResult {
    return { type: OnPreRoutingResultType.next };
  },
  rewriteUrl(url: string): OnPreRoutingResult {
    return { type: OnPreRoutingResultType.rewriteUrl, url };
  },
  isNext(result: OnPreRoutingResult): result is OnPreRoutingResultNext {
    return result && result.type === OnPreRoutingResultType.next;
  },
  isRewriteUrl(result: OnPreRoutingResult): result is OnPreRoutingResultRewriteUrl {
    return result && result.type === OnPreRoutingResultType.rewriteUrl;
  },
};

const toolkit: OnPreRoutingToolkit = {
  next: preRoutingResult.next,
  rewriteUrl: preRoutingResult.rewriteUrl,
};

/**
 * Adopt custom request interceptor to Fastify lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToFastifyOnRequest(
  fn: OnPreRoutingHandler,
  log: Logger
): onRequestAsyncHookHandler {
  return async function interceptPreRoutingRequest(request, reply) {
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

      if (preRoutingResult.isNext(result)) {
        return;
      }

      if (preRoutingResult.isRewriteUrl(result)) {
        const appState = request.context.config as KibanaRequestState;
        appState.rewrittenUrl = appState.rewrittenUrl ?? new URL(request.url);

        const { url } = result;
        // @ts-expect-error: Cannot assign to 'url' because it is a read-only property.
        request.url = url; // TODO: Find a proper way to do this in Fastify

        // We should update raw request as well since it can be proxied to the old platform
        request.raw.url = url;
        return;
      }
      throw new Error(
        `Unexpected result from OnPreRouting. Expected OnPreRoutingResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      throw fastifyResponseAdapter.toInternalError();
    }
  };
}
