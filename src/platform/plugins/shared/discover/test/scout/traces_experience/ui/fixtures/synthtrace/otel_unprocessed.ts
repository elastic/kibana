/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { OTEL_SERVICE } from '../constants';
import { otelTrace } from './complete_traces_experience';

// Indexes OTel spans as raw documents, bypassing the APM ingest pipeline.
export async function indexUnprocessedOtelTrace(
  esClient: Client,
  timeRange: { from: number; to: number }
): Promise<void> {
  const docs = Array.from(otelTrace(timeRange))
    .flatMap((event) => event.serialize())
    .filter((doc) => !!doc.kind);

  const operations = docs.flatMap((doc) => [
    { create: { _index: 'traces-test.otel-default' } },
    { ...doc, 'service.name': OTEL_SERVICE.SERVICE_NAME },
  ]);

  const result = await esClient.bulk({ operations, refresh: true });
  if (result.errors) {
    const failures = result.items.flatMap((item) =>
      item.create?.error ? [item.create.error] : []
    );
    throw new Error(`Bulk indexing failed: ${JSON.stringify(failures)}`);
  }
}
