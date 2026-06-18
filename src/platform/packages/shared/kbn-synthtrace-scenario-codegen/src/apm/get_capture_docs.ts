/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  Sort,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '@kbn/apm-types';
import {
  HOST_NAME,
  METRICSET_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types/es_fields';
import { kqlQuery, termQuery } from '@kbn/es-query';
import { searchAllPages } from '../search_all_pages';
import type { PageSearchFn } from '../search_all_pages';
import type { CapturedSource } from './reconstruct';

const CAPTURE_EVENTS = [ProcessorEvent.transaction, ProcessorEvent.span, ProcessorEvent.error];

/**
 * Max documents per shard the trace-id discovery aggregation considers. The discovery step runs
 * a high-cardinality `trace.id` terms aggregation; on dense deployments an unbounded aggregation
 * builds global ordinals over every matching doc, so a wide window blows past the ES request
 * timeout. Wrapping it in a `sampler` caps the work to a bounded, representative subset per shard,
 * which lets the caller use larger time slices (and therefore far fewer total requests) without
 * timing out. Captures that exceed it are flagged truncated.
 */
const DISCOVERY_SHARD_SAMPLE_SIZE = 50_000;

/**
 * Minimal structural view of `APMEventClient.search`. Keeping it structural lets this shared,
 * domain-agnostic helper query APM data without depending on the (solution) apm-data-access plugin:
 * the apm and infra routes each pass a thin wrapper around their own `APMEventClient`.
 */
export interface ApmCaptureSearchRequest {
  apm: { events: ProcessorEvent[] };
  track_total_hits: boolean | number;
  size: number;
  _source?: boolean;
  query?: QueryDslQueryContainer;
  sort?: Sort;
  search_after?: SortResults;
  aggs?: Record<string, AggregationsAggregationContainer>;
}

export interface ApmCaptureSearchResponse {
  hits: { hits: Array<{ _source?: unknown; sort?: unknown[] }> };
  aggregations?: Record<string, unknown>;
}

export type ApmCaptureSearchFn = (
  operationName: string,
  params: ApmCaptureSearchRequest
) => Promise<ApmCaptureSearchResponse>;

/** Shape of the (sampled, per-service) trace-id discovery aggregation we issue below. */
interface DiscoveryAggregations {
  sample?: {
    services?: {
      buckets?: Array<{ traces?: { buckets?: Array<{ key: string }> } }>;
    };
  };
}

/**
 * Inlined `@kbn/observability-plugin` `rangeQuery`, kept here so this package stays free of
 * solution-plugin dependencies.
 */
const rangeQuery = (start: number, end: number): QueryDslQueryContainer[] => [
  { range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } } },
];

/**
 * Inlined `@kbn/apm-plugin` `environmentQuery`: `[]` for `ENVIRONMENT_ALL`, the not-defined match
 * for `ENVIRONMENT_NOT_DEFINED`/empty, else a `term` on `service.environment`.
 */
const environmentQuery = (environment: string): QueryDslQueryContainer[] => {
  if (environment === ENVIRONMENT_ALL.value) {
    return [];
  }
  if (!environment || environment === ENVIRONMENT_NOT_DEFINED.value) {
    return [
      {
        bool: {
          should: [
            { term: { [SERVICE_ENVIRONMENT]: ENVIRONMENT_NOT_DEFINED.value } },
            { bool: { must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }] } },
          ],
          minimum_should_match: 1,
        },
      },
    ];
  }
  return [{ term: { [SERVICE_ENVIRONMENT]: environment } }];
};

/**
 * Binds an injected APM search function to the client-agnostic `searchAllPages` pager by
 * translating its generic `{ size, query, sort, search_after }` page request into an APM event
 * search for the given processor events.
 */
const createApmPageSearch =
  (search: ApmCaptureSearchFn, operationName: string, events: ProcessorEvent[]): PageSearchFn =>
  (params) =>
    search(operationName, {
      apm: { events },
      track_total_hits: false,
      _source: true,
      size: params.size,
      query: params.query as QueryDslQueryContainer,
      sort: params.sort as Sort,
      ...(params.search_after ? { search_after: params.search_after as SortResults } : {}),
    });

/**
 * Fetches the raw `_source` behind the current APM page so it can be reconstructed
 * into a synthtrace scenario. It captures both the traces and the application/system/
 * runtime metrics (`metricset.name: app`) visible under the current filters.
 *
 * Traces are fetched in two phases so the result reflects the page's filters AND yields
 * complete, replayable traces:
 *  1. Find the `trace.id`s of every trace that has at least one document matching the
 *     current time range and filters (environment + kuery + host names).
 *  2. Fetch ALL transaction/span/error documents for those traces in the time range.
 *
 * This avoids the trap where a filter that only matches one document type (e.g. a
 * transaction-only kuery) would otherwise drop the rest of the trace.
 *
 * App metrics are fetched separately (they carry no `trace.id`) using the same time
 * range and filters. Transaction/span/breakdown metrics are intentionally NOT captured
 * because synthtrace regenerates those from the traces on ingest.
 *
 * The caller is responsible for clamping `start`/`end` to a sane window; this keeps the
 * aggregation and metric scans bounded no matter how wide a range the user selected.
 */
export async function getApmCaptureDocs({
  search,
  start,
  end,
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  hostNames,
  maxServices,
  tracesPerService,
  maxDocs,
  maxMetricDocs,
}: {
  search: ApmCaptureSearchFn;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  /** Service the page is scoped to (from the URL path), if any. */
  serviceName?: string;
  /** Transaction type the page is scoped to, if any. */
  transactionType?: string;
  /** Transaction name the page is scoped to, if any. */
  transactionName?: string;
  /** Host names to scope the capture to (used by the Hosts capture to grab APM-only hosts). */
  hostNames?: string[];
  maxServices: number;
  tracesPerService: number;
  maxDocs: number;
  maxMetricDocs: number;
}): Promise<{ docs: CapturedSource[]; truncated: boolean }> {
  const scopedHostNames = hostNames ?? [];
  const hasHostNames = scopedHostNames.length > 0;
  const hostNamesQuery: QueryDslQueryContainer[] = hasHostNames
    ? [{ terms: { [HOST_NAME]: scopedHostNames } }]
    : [];

  // The page's navigation context (service/transaction) scopes which traces are shown even
  // though it isn't part of the KQL bar; apply it when discovering trace ids.
  const pageFilters = [
    ...termQuery(SERVICE_NAME, serviceName, { queryEmptyString: false }),
    ...termQuery(TRANSACTION_TYPE, transactionType, { queryEmptyString: false }),
    ...termQuery(TRANSACTION_NAME, transactionName, { queryEmptyString: false }),
  ];

  // A filter that can match only PART of a trace - a KQL query, a transaction type/name (which
  // only match transaction docs, not their spans), a host-name set, or a single service of a
  // distributed trace - requires two-phase trace-id discovery so we still emit complete traces.
  // Such filters also narrow the data enough that the (bounded) discovery aggregation stays cheap.
  //
  // A broad capture (no such filter) instead scans documents directly: the same range query
  // matches every captured doc type, so traces are already as complete as the doc cap allows, and
  // we skip the high-cardinality `trace.id` aggregation entirely - that aggregation has to visit
  // the whole match set and times out on dense, unfiltered windows regardless of sampling.
  const needsTraceIdDiscovery = Boolean(
    kuery || serviceName || transactionType || transactionName || hasHostNames
  );

  let traceDocs: CapturedSource[] = [];
  let traceDocsTruncated = false;
  let tracesTruncated = false;

  if (needsTraceIdDiscovery) {
    // Sample trace ids PER SERVICE rather than via a single flat top-N terms aggregation: a flat
    // aggregation is dominated by high-volume services, so low-volume services would contribute no
    // traces. The `sampler` bounds the per-shard work so the discovery step can't time out.
    const idsResponse = await search('get_trace_ids_for_synthtrace_capture', {
      apm: { events: CAPTURE_EVENTS },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...pageFilters,
            ...hostNamesQuery,
          ],
        },
      },
      aggs: {
        sample: {
          sampler: { shard_size: DISCOVERY_SHARD_SAMPLE_SIZE },
          aggs: {
            services: {
              terms: { field: SERVICE_NAME, size: maxServices },
              aggs: {
                traces: {
                  terms: { field: TRACE_ID, size: tracesPerService },
                },
              },
            },
          },
        },
      },
    });

    const aggregations = idsResponse.aggregations as DiscoveryAggregations | undefined;
    const serviceBuckets = aggregations?.sample?.services?.buckets ?? [];
    const traceIds = [
      ...new Set(
        serviceBuckets.flatMap((serviceBucket) =>
          (serviceBucket.traces?.buckets ?? []).map((traceBucket) => traceBucket.key)
        )
      ),
    ];
    tracesTruncated =
      serviceBuckets.length >= maxServices ||
      serviceBuckets.some(
        (serviceBucket) => (serviceBucket.traces?.buckets ?? []).length >= tracesPerService
      );

    if (traceIds.length > 0) {
      ({ docs: traceDocs, truncated: traceDocsTruncated } = await searchAllPages<CapturedSource>({
        search: createApmPageSearch(search, 'get_docs_for_synthtrace_capture', CAPTURE_EVENTS),
        max: maxDocs,
        query: {
          bool: {
            filter: [...rangeQuery(start, end), { terms: { [TRACE_ID]: traceIds } }],
          },
        },
      }));
    }
  } else {
    ({ docs: traceDocs, truncated: traceDocsTruncated } = await searchAllPages<CapturedSource>({
      search: createApmPageSearch(search, 'get_docs_for_synthtrace_capture', CAPTURE_EVENTS),
      max: maxDocs,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...environmentQuery(environment)],
        },
      },
    }));
  }

  const { docs: metricDocs, truncated: metricDocsTruncated } = await searchAllPages<CapturedSource>({
    search: createApmPageSearch(search, 'get_metrics_for_synthtrace_capture', [
      ProcessorEvent.metric,
    ]),
    max: maxMetricDocs,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...environmentQuery(environment),
          ...kqlQuery(kuery),
          // Only the service scope applies to metrics; transaction type/name aren't metric fields.
          ...termQuery(SERVICE_NAME, serviceName, { queryEmptyString: false }),
          ...hostNamesQuery,
          { term: { [METRICSET_NAME]: 'app' } },
        ],
      },
    },
  });

  return {
    docs: [...traceDocs, ...metricDocs],
    truncated: tracesTruncated || traceDocsTruncated || metricDocsTruncated,
  };
}
