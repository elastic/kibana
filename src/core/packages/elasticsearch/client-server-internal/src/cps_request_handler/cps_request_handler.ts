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
import type { TransportRequestMetadata } from '@elastic/elasticsearch';
import { metrics, ValueType } from '@opentelemetry/api';
import type { OnRequestHandler } from '../create_transport';

// temporary type correction while @elastic/elasticsearch types fixes the actual acceptedParams type
interface StructuredAcceptedParams {
  path: string[];
  body: string[];
  query: string[];
}

type AcceptedParams = NonNullable<TransportRequestMetadata['acceptedParams']>;

const meter = metrics.getMeter('kibana.elasticsearch.cps');

const requestsTotalCounter = meter.createCounter('cps.requests.total', {
  description: 'Total Elasticsearch requests processed by CPS handler by routing type',
  unit: '1',
  valueType: ValueType.INT,
});

const requestsWithoutRoutingCounter = meter.createCounter('cps.requests.without_routing', {
  description: 'Requests without project_routing parameter while CPS enabled (bypass indicator)',
  unit: '1',
  valueType: ValueType.INT,
});

/** @internal */
export function getCpsRequestHandler(
  cpsEnabled: boolean,
  projectRouting: string
): OnRequestHandler {
  return (_ctx, params, _options) => {
    const body = isPlainObject(params.body) ? (params.body as Record<string, unknown>) : undefined;
    const { acceptedParams, name } = params.meta ?? {};

    let routingType: 'injected' | 'explicit' | 'stripped' | 'none';

    if (cpsEnabled) {
      if (isProjectRoutingInQuery(acceptedParams)) {
        const hadExplicitRouting =
          typeof params.querystring === 'object' && params.querystring?.project_routing != null;

        injectProjectRoutingQueryString(projectRouting, params);

        routingType = hadExplicitRouting ? 'explicit' : 'injected';
      } else if (isProjectRoutingInBody(acceptedParams)) {
        if (body?.pit) {
          // The project_routing is set by the openPit API, and thus part of the PIT context.
          stripProjectRoutingBody(body);
          routingType = 'stripped';
        } else {
          const hadExplicitRouting = body?.project_routing != null;

          injectProjectRoutingBody(projectRouting, params, body);

          routingType = hadExplicitRouting ? 'explicit' : 'injected';
        }
      } else {
        routingType = 'none';
      }
    } else {
      // Strip from body, querystring, and NDJSON bulk body unconditionally: project_routing is
      // only valid when CPS is enabled on ES, so it must be removed regardless of location.
      stripProjectRoutingBody(body);
      stripProjectRoutingQueryString(params);
      stripProjectRoutingNdjsonBody(params);
      routingType = 'stripped';
    }

    requestsTotalCounter.add(1, {
      'cps.routing_type': routingType,
      'cps.enabled': String(cpsEnabled),
      'api.name': name ?? 'unknown',
    });

    if (cpsEnabled && routingType === 'none') {
      if (isProjectRoutingInQuery(acceptedParams) || isProjectRoutingInBody(acceptedParams)) {
        requestsWithoutRoutingCounter.add(1, {
          'api.name': name ?? 'unknown',
        });
      }
    }
  };
}

/**
 * Returns true when `project_routing` must be sent as a query parameter rather than in the
 * request body. This applies to NDJSON-body APIs (e.g. `msearch`, `msearch_template`) where
 * injecting into the body would corrupt the newline-delimited format.
 *
 * Relies on the structured `acceptedParams` introduced in elasticsearch-js v9.3.3. Falls back to
 * body injection for flat-array `acceptedParams` (legacy or direct `transport.request()` callers).
 */
function isProjectRoutingInQuery(acceptedParams: AcceptedParams | undefined): boolean {
  if (!acceptedParams || Array.isArray(acceptedParams)) return false;
  return (acceptedParams as StructuredAcceptedParams).query.includes('project_routing');
}

/**
 * Returns true if `project_routing` is an accepted body parameter for this API.
 *
 * Handles both the legacy flat-array form (produced by older client versions or raw
 * `transport.request()` callers) and the current structured form introduced in elasticsearch-js
 * v9.3.3, which differentiates between path, body, and query parameters.
 */
function isProjectRoutingInBody(acceptedParams: AcceptedParams | undefined): boolean {
  if (!acceptedParams) return false;
  if (Array.isArray(acceptedParams)) return acceptedParams.includes('project_routing');
  return (acceptedParams as StructuredAcceptedParams).body.includes('project_routing');
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

/**
 * Strips `project_routing` from NDJSON bulk bodies (`params.bulkBody`).
 *
 * msearch and msearch_template use `bulkBody` (not `body`) for their NDJSON payloads.
 * When CPS is disabled each entry in the array — or each newline-delimited JSON line in a
 * pre-serialised string — may still carry a `project_routing` key that was set by application
 * code. We remove it here so non-CPS ES does not reject the request.
 *
 * Supported bulkBody shapes:
 *  - `Array<Record<string, unknown>>` – produced by the high-level ES client
 *  - `string` – pre-serialised NDJSON (e.g. via transport.request())
 *
 * Buffer and ReadableStream are skipped because they cannot be safely parsed/rewritten.
 */
function stripProjectRoutingNdjsonBody(params: Parameters<OnRequestHandler>[1]): void {
  const { bulkBody } = params;
  if (!bulkBody) return;

  if (Array.isArray(bulkBody)) {
    for (const entry of bulkBody) {
      if (isPlainObject(entry)) {
        stripProjectRoutingBody(entry as Record<string, unknown>);
      }
    }
  } else if (typeof bulkBody === 'string') {
    params.bulkBody = bulkBody
      .split('\n')
      .map((line) => {
        if (!line) return line;
        try {
          const parsed: unknown = JSON.parse(line);
          if (isPlainObject(parsed)) {
            const obj = parsed as Record<string, unknown>;
            if (obj.project_routing != null) {
              delete obj.project_routing;
              return JSON.stringify(obj);
            }
          }
        } catch {
          // Not valid JSON; leave the line as-is.
        }
        return line;
      })
      .join('\n');
  }
  // Buffer and ReadableStream: cannot safely parse or rewrite — skip.
}
