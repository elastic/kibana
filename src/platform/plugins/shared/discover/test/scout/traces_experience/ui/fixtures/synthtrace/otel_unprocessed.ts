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
  const docs = Array.from(otelTrace(timeRange)).flatMap((event) => event.serialize());

  for (const doc of docs) {
    if (!doc.kind) continue;
    await esClient.index({
      index: 'traces-test.otel-default',
      document: { ...doc, 'service.name': OTEL_SERVICE.SERVICE_NAME },
      refresh: 'wait_for',
    });
  }
}
