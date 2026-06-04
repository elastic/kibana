/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This file re-implements the data source selection logic from
// apm_data_access/common/utils/get_preferred_bucket_size_and_data_source.ts.
// That module lives in an x-pack plugin and should not be imported from a platform package.
import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';

interface TimeRangeMetadataSource {
  documentType: string;
  rollupInterval: string;
  hasDocs: boolean;
}

// TODO: replace with typed callApmApi once it lives in a package outside of APM (https://github.com/elastic/kibana/issues/271155)
interface TimeRangeMetadataResponse {
  sources: TimeRangeMetadataSource[];
}

export interface PreferredTransactionDataSource {
  documentType: string;
  rollupInterval: string;
}

const FALLBACK: PreferredTransactionDataSource = {
  documentType: 'transactionMetric',
  rollupInterval: '1m',
};

// The main_statistics endpoint uses transactionDataSourceRt which only accepts
// transactionMetric and transactionEvent — not serviceTransactionMetric, which
// aggregates at service level and has no per-transaction-name breakdown.
const DOCUMENT_TYPE_PREFERENCE = ['transactionMetric', 'transactionEvent'];

// Matches the numBuckets value used by APM's transactions table.
const NUM_BUCKETS = 20;

function parseIntervalSeconds(rollupInterval: string): number {
  if (rollupInterval === 'none') return 0;
  const match = rollupInterval.match(/^(\d+)(m|h)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  return match[2] === 'h' ? value * 3600 : value * 60;
}

function pickPreferredTransactionSource(
  sources: TimeRangeMetadataSource[],
  bucketSizeInSeconds: number
): PreferredTransactionDataSource {
  const eligible = sources.filter(
    (s) => s.hasDocs && DOCUMENT_TYPE_PREFERENCE.includes(s.documentType)
  );
  if (!eligible.length) return FALLBACK;

  // Sort by document type preference (ascending), then coarsest rollup first within the same type.
  const sorted = [...eligible].sort((a, b) => {
    const docTypeDiff =
      DOCUMENT_TYPE_PREFERENCE.indexOf(a.documentType) -
      DOCUMENT_TYPE_PREFERENCE.indexOf(b.documentType);
    if (docTypeDiff !== 0) return docTypeDiff;
    return parseIntervalSeconds(b.rollupInterval) - parseIntervalSeconds(a.rollupInterval);
  });

  const preferredDocType = sorted[0].documentType;
  const fromPreferredDocType = sorted.filter((s) => s.documentType === preferredDocType);

  // Pick the coarsest rollup that still fits within the target bucket size.
  // Fall back to the finest available if none fit (e.g. all rollups are coarser than the window).
  const { documentType, rollupInterval } =
    fromPreferredDocType.find(
      (s) => parseIntervalSeconds(s.rollupInterval) <= bucketSizeInSeconds
    ) ?? fromPreferredDocType[fromPreferredDocType.length - 1];

  return { documentType, rollupInterval };
}

export function usePreferredTransactionDataSource({
  http,
  start,
  end,
}: {
  http: HttpStart;
  start: string;
  end: string;
}): PreferredTransactionDataSource | null {
  const [dataSource, setDataSource] = useState<PreferredTransactionDataSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bucketSizeInSeconds =
      (new Date(end).getTime() - new Date(start).getTime()) / 1000 / NUM_BUCKETS;

    // TODO: replace with typed callApmApi once it lives in a package outside of APM (https://github.com/elastic/kibana/issues/271155)
    http
      .get<TimeRangeMetadataResponse>('/internal/apm/time_range_metadata', {
        query: { start, end, kuery: '', useSpanName: false },
      })
      .then((meta) => {
        if (!cancelled)
          setDataSource(pickPreferredTransactionSource(meta.sources, bucketSizeInSeconds));
      })
      .catch(() => {
        if (!cancelled) setDataSource(FALLBACK);
      });

    return () => {
      cancelled = true;
    };
  }, [http, start, end]);

  return dataSource;
}
