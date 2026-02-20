/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { isPlainObject } from 'lodash';
import type { OnRequestHandler } from '@kbn/core-elasticsearch-client-server-internal';

const LOCAL_PROJECT_ROUTING = '_alias:_origin';

/** @internal */
export class CpsRequestHandler {
  constructor(private readonly cpsEnabled: boolean) {}

  public readonly onRequest: OnRequestHandler = (_ctx, params, _options) => {
    const body = isPlainObject(params.body) ? (params.body as Record<string, unknown>) : undefined;

    if (this.cpsEnabled) {
      if (this.shouldApplyProjectRouting(params.meta?.acceptedParams))
        if (body?.pit) {
          // The project_routing is set by the openPit API, and thus part of the PIT context.
          this.stripProjectRouting(body);
        } else {
          this.injectProjectRouting(params, body);
        }
    } else {
      this.stripProjectRouting(body);
    }
  };

  private stripProjectRouting(body: Record<string, unknown> | undefined): void {
    if (body?.project_routing != null) {
      delete body.project_routing;
    }
  }

  private injectProjectRouting(
    params: Parameters<OnRequestHandler>[1],
    body: Record<string, unknown> | undefined
  ): void {
    if (!body?.project_routing) {
      set(params, 'body.project_routing', LOCAL_PROJECT_ROUTING);
    }
  }

  private shouldApplyProjectRouting(acceptedParams: string[] | undefined): boolean {
    return Boolean(acceptedParams?.includes('project_routing'));
  }
}
