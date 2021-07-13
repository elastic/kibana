/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import { Logger } from '../../logging';
import {
  HapiResponseAdapter,
  KibanaRequest,
  KibanaResponse,
  lifecycleResponseFactory,
  LifecycleResponseFactory,
  KibanaRequestState,
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

type OnPreRoutingResult = Next | RewriteUrl;

const preRoutingResult = {
  next(): OnPreRoutingResult {
    return { type: ResultType.next };
  },
  rewriteUrl(url: string): OnPreRoutingResult {
    return { type: ResultType.rewriteUrl, url };
  },
  isNext(result: OnPreRoutingResult): result is Next {
    return result && result.type === ResultType.next;
  },
  isRewriteUrl(result: OnPreRoutingResult): result is RewriteUrl {
    return result && result.type === ResultType.rewriteUrl;
  },
};

/**
 * @public
 * A tool set defining an outcome of OnPreRouting interceptor for incoming request.
 */
export interface OnPreRoutingToolkit {
  /** To pass request to the next handler */
  next: () => OnPreRoutingResult;
  /** Rewrite requested resources url before is was authenticated and routed to a handler */
  rewriteUrl: (url: string) => OnPreRoutingResult;
}

const toolkit: OnPreRoutingToolkit = {
  next: preRoutingResult.next,
  rewriteUrl: preRoutingResult.rewriteUrl,
};

/**
 * See {@link OnPreRoutingToolkit}.
 * @public
 */
export type OnPreRoutingHandler = (
  request: KibanaRequest,
  response: LifecycleResponseFactory,
  toolkit: OnPreRoutingToolkit
) => OnPreRoutingResult | KibanaResponse | Promise<OnPreRoutingResult | KibanaResponse>;

/**
 * @public
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
      const result = await fn(KibanaRequest.from(request), lifecycleResponseFactory, toolkit);
      if (result instanceof KibanaResponse) {
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
