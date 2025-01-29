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
  KibanaRequestState,
  OnPreRoutingToolkit,
  OnPreRoutingResultRewriteUrl,
  OnPreRoutingResultNext,
  OnPreRoutingResult,
  OnPreRoutingHandler,
} from '@kbn/core-http-server';
import { isKibanaResponse } from '@kbn/core-http-server';
import { OnPreRoutingResultType } from '@kbn/core-http-server';
import {
  HapiResponseAdapter,
  CoreKibanaRequest,
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
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export function adoptToHapiOnRequest(fn: OnPreRoutingHandler, log: Logger) {
  return async function interceptPreRoutingRequest(
    request: Request,
    responseToolkit: HapiResponseToolkit
  ): Promise<Lifecycle.ReturnValue> {
    const hapiResponseAdapter = new HapiResponseAdapter(responseToolkit);

    try {
      const result = await fn(CoreKibanaRequest.from(request), lifecycleResponseFactory, toolkit);
      if (isKibanaResponse(result)) {
        return hapiResponseAdapter.handle(result);
      }

      if (preRoutingResult.isNext(result)) {
        return responseToolkit.continue;
      }

      if (preRoutingResult.isRewriteUrl(result)) {
        const appState = request.app as KibanaRequestState;
        appState.rewrittenUrl = appState.rewrittenUrl ?? request.url;

        const { url } = result;
        request.setUrl(url);

        // We should update raw request as well since it can be proxied to the old platform
        request.raw.req.url = url;
        return responseToolkit.continue;
      }
      throw new Error(
        `Unexpected result from OnPreRouting. Expected OnPreRoutingResult or KibanaResponse, but given: ${result}.`
      );
    } catch (error) {
      log.error(error);
      return hapiResponseAdapter.toInternalError();
    }
  };
}
