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
import type { OnRequestHandler } from './create_transport';

/**
 * APIs that use NDJSON (newline-delimited JSON) bodies. For these, `project_routing` must be
 * passed as a query parameter rather than in the body, since injecting into the body would
 * corrupt the NDJSON format and cause ES to return an `illegal_argument_exception`.
 */
const NDJSON_APIS = new Set(['msearch', 'msearch_template']);

/** @internal */
export function getCpsRequestHandler(
  cpsEnabled: boolean,
  projectRouting: string
): OnRequestHandler {
  return (_ctx, params, _options) => {
    const body = isPlainObject(params.body) ? (params.body as Record<string, unknown>) : undefined;
    const ndjsonApi = isNdjsonApi(params);

    if (cpsEnabled) {
      if (shouldApplyProjectRouting(params.meta?.acceptedParams)) {
        if (ndjsonApi) {
          injectProjectRoutingQueryString(projectRouting, params);
        } else {
          if (body?.pit) {
            // The project_routing is set by the openPit API, and thus part of the PIT context.
            stripProjectRoutingBody(body);
          } else {
            injectProjectRoutingBody(projectRouting, params, body);
          }
        }
      }
    } else {
      // Strip from both body and querystring unconditionally: project_routing is only valid
      // when CPS is enabled on ES, so it must be removed from all requests regardless of location.
      stripProjectRoutingBody(body);
      stripProjectRoutingQueryString(params);
    }
  };
}

function isNdjsonApi(params: Parameters<OnRequestHandler>[1]): boolean {
  return NDJSON_APIS.has(params.meta?.name ?? '');
}

function stripProjectRoutingBody(body: Record<string, unknown> | undefined): void {
  if (body?.project_routing != null) {
    delete body.project_routing;
  }
}

function injectProjectRoutingBody(
  projectRouting: string,
  params: Parameters<OnRequestHandler>[1],
  body: Record<string, unknown> | undefined
): void {
  if (!body?.project_routing) {
    set(params, 'body.project_routing', projectRouting);
  }
}

function injectProjectRoutingQueryString(
  projectRouting: string,
  params: Parameters<OnRequestHandler>[1]
): void {
  if (typeof params.querystring === 'string') {
    // Cannot safely inject into a pre-serialized querystring; skip.
    return;
  }

  if (!params.querystring) {
    params.querystring = {};
  }

  if (params.querystring.project_routing) {
    return;
  }
  params.querystring.project_routing = projectRouting;
}

function stripProjectRoutingQueryString(params: Parameters<OnRequestHandler>[1]): void {
  const qs = params.querystring;
  if (qs != null && typeof qs === 'object' && qs.project_routing != null) {
    delete qs.project_routing;
  }
}

function shouldApplyProjectRouting(acceptedParams: string[] | undefined): boolean {
  return Boolean(acceptedParams?.includes('project_routing'));
}
