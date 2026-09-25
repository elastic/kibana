/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ActivityInvestigationSnapshot } from '../../common/activity_investigation/attachment';

export type Scope = ActivityInvestigationSnapshot['scope'];
export const TIMEOUT_MS = 10_000;
export interface RequestMeasurement {
  phase: string;
  elapsedMs: number;
  bodyReadMs: number;
  requestBytes: number;
  responseBytes: number;
  serverTookMs?: number;
  warning?: string;
  error?: string;
}

type CaptureResponse = (response: {
  status: number;
  warning: string | null;
  body: string;
}) => Promise<void>;

const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const tableSchema = z.object({
  columns: z.array(z.object({ name: z.string(), type: z.string() })),
  values: z.array(z.array(z.union([scalar, z.array(scalar)]))),
  took: z.number().optional(),
  is_partial: z.boolean().optional(),
  is_running: z.boolean().optional(),
  approximation_applied: z.boolean().optional(),
  _clusters: z
    .object({
      total: z.number(),
      successful: z.number(),
      details: z.record(
        z.string(),
        z.object({
          status: z.string(),
          failures: z.array(z.json()).optional(),
          _shards: z.object({ failed: z.number() }).optional(),
        })
      ),
    })
    .optional(),
});

/** Uses explicit credentials and records every request, including failures; never retries or discovers hosts. */
export const createTransport = () => {
  const baseUrl = process.env.KIBANA_URL?.replace(/\/$/, '');
  const credentials = process.env.KIBANA_AUTH;
  if (!baseUrl || !credentials) throw new Error('Set KIBANA_URL and KIBANA_AUTH explicitly');
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(
      'Use an HTTP(S) KIBANA_URL without credentials; put credentials in KIBANA_AUTH'
    );
  }
  const records: RequestMeasurement[] = [];
  const send = async (
    path: string,
    body: string | undefined,
    signal: AbortSignal | undefined,
    phase: string,
    captureResponse?: CaptureResponse
  ) => {
    const measurement: RequestMeasurement = {
      phase,
      elapsedMs: 0,
      bodyReadMs: 0,
      requestBytes: Buffer.byteLength(body ?? ''),
      responseBytes: 0,
    };
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
          'content-type': 'application/json',
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
          'elastic-api-version': '1',
        },
        body,
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
          : AbortSignal.timeout(TIMEOUT_MS),
      });
      const headersReceived = performance.now();
      const text = await response.text();
      measurement.bodyReadMs = performance.now() - headersReceived;
      measurement.responseBytes = Buffer.byteLength(text);
      const warning = response.headers.get('warning');
      // Opt-in synthetic diagnostics retain the body even when HTTP or quality checks reject it.
      if (captureResponse) await captureResponse({ status: response.status, warning, body: text });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 1000)}`);
      if (warning) {
        measurement.warning = warning;
        // Discover's original query may warn about its default display limit; keep that baseline intact.
        if (phase !== 'discover-query') throw new Error(warning);
      }
      return { text, measurement };
    } catch (error) {
      measurement.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      measurement.elapsedMs = performance.now() - started;
      records.push(measurement);
    }
  };

  const request = (
    path: string,
    method: 'GET' | 'POST' | 'PUT',
    body?: string,
    signal?: AbortSignal
  ) =>
    send(
      `/api/console/proxy?${new URLSearchParams({ path, method })}`,
      body,
      signal,
      'metadata'
    ).then(({ text }) => text);

  const esql = async (
    query: string,
    signal: AbortSignal,
    phase: string,
    scope?: Scope,
    captureResponse?: CaptureResponse
  ) => {
    const filters = scope?.filter ? [scope.filter].flat() : [];
    const { text, measurement } = await send(
      '/internal/search/esql',
      JSON.stringify({
        params: {
          query,
          params: scope?.params,
          time_zone: scope?.timeZone,
          filter: scope
            ? {
                bool: {
                  filter: [
                    ...filters,
                    {
                      range: {
                        [scope.timeFieldName]: {
                          gte: scope.timeRange.from,
                          // Match Discover's time filter; incomplete edge buckets are excluded later.
                          lte: scope.timeRange.to,
                        },
                      },
                    },
                  ],
                },
              }
            : undefined,
          allow_partial_results: false,
          dropNullColumns: false,
          include_execution_metadata: true,
        },
        projectRouting: scope?.projectRouting,
        approximation: false,
      }),
      signal,
      phase,
      captureResponse
    );
    try {
      const response = z
        .object({ rawResponse: tableSchema, warning: z.json().optional() })
        .parse(JSON.parse(text));
      const result = response.rawResponse;
      measurement.serverTookMs = result.took;
      if (response.warning) measurement.warning = JSON.stringify(response.warning);
      const clusters = result._clusters;
      const failedCluster =
        clusters &&
        (clusters.successful !== clusters.total ||
          Object.values(clusters.details).some(
            (cluster) =>
              cluster.status !== 'successful' || cluster.failures?.length || cluster._shards?.failed
          ));
      if (
        (response.warning && phase !== 'discover-query') ||
        result.is_partial ||
        result.is_running ||
        result.approximation_applied ||
        (scope && !clusters) ||
        failedCluster
      ) {
        throw new Error('Incomplete, approximate or warning-bearing ES|QL response');
      }
      return result;
    } catch (error) {
      measurement.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  };
  return { request, esql, records };
};

export type Transport = ReturnType<typeof createTransport>;
