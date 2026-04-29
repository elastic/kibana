/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a single complete trace anchored to now.
 * Use a short range to avoid duplicates:
 *
 *   node scripts/synthtrace complete_trace --from=now-1m --to=now --clean
 *
 * The trace contains:
 * - Root transaction (GET /checkout) with 2 APM errors
 * - DB span child with 1 APM error
 * - Internal span child with a span link (to a producer trace)
 * - Info + warning logs correlated to the transaction
 */

import type { ApmFields, LogDocument, Serializable } from '@kbn/synthtrace-client';
import { apm, log } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<ApmFields | LogDocument> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient, logsEsClient } }) => {
      const timestamp = range.to.getTime() - 1000;

      const frontend = apm
        .service({ name: 'synth-traces-frontend', environment: 'production', agentName: 'nodejs' })
        .instance('frontend-1');

      const backend = apm
        .service({ name: 'synth-traces-backend', environment: 'production', agentName: 'go' })
        .instance('backend-1');

      // --- Producer trace (provides the span link target) ---
      const producerTx = backend
        .transaction({ transactionName: 'Background job' })
        .timestamp(timestamp)
        .duration(200)
        .success()
        .children(
          backend
            .span({
              spanName: 'publish to kafka/orders',
              spanType: 'messaging',
              spanSubtype: 'kafka',
            })
            .destination('kafka/orders')
            .timestamp(timestamp + 10)
            .duration(50)
            .success()
        );

      const producerSpan = producerTx.serialize().find((e) => e['processor.event'] === 'span');
      const spanLink = {
        trace: { id: producerSpan!['trace.id']! },
        span: { id: producerSpan!['span.id']! },
      };

      // --- Main trace ---
      const mainTx = frontend
        .transaction({ transactionName: 'GET /checkout' })
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          frontend
            .span({ spanName: 'SELECT * FROM orders', spanType: 'db', spanSubtype: 'postgresql' })
            .destination('postgresql')
            .timestamp(timestamp + 10)
            .duration(300)
            .success(),
          frontend
            .span({ spanName: 'process-order', spanType: 'app', spanSubtype: 'internal' })
            .defaults({ 'span.links': [spanLink] })
            .timestamp(timestamp + 320)
            .duration(400)
            .success()
        );

      const mainFields = mainTx.serialize();
      const transaction = mainFields.find((e) => e['processor.event'] === 'transaction');
      const dbSpan = mainFields.find(
        (e) => e['processor.event'] === 'span' && e['span.name'] === 'SELECT * FROM orders'
      );

      const traceId = transaction!['trace.id']!;
      const transactionId = transaction!['transaction.id']!;
      const dbSpanId = dbSpan!['span.id']!;

      const createError = (
        message: string,
        type: string,
        parentId: string,
        errorTimestamp: number
      ): Serializable<ApmFields> => {
        const error = frontend.error({ message, type });
        error.fields['trace.id'] = traceId;
        error.fields['transaction.id'] = transactionId;
        error.fields['parent.id'] = parentId;
        error.fields['span.id'] = parentId;
        error.fields['error.grouping_key'] = `${type}-${parentId}`;
        return error.timestamp(errorTimestamp);
      };

      // Transaction: 2 errors — DB span: 1 error
      const apmIterable = range
        .interval('1m')
        .rate(1)
        .generator(() => [
          producerTx,
          mainTx,
          createError(
            'Validation failed: missing required field',
            'ValidationError',
            transactionId,
            timestamp + 100
          ),
          createError('Payment gateway timeout', 'PaymentError', transactionId, timestamp + 200),
          createError('Query timeout after 300ms', 'QueryTimeoutError', dbSpanId, timestamp + 310),
        ]);

      const logIterable = range
        .interval('1m')
        .rate(1)
        .generator(() => [
          log
            .create()
            .message('Checkout request received')
            .logLevel('info')
            .service('synth-traces-frontend')
            .defaults({ 'trace.id': traceId, 'span.id': transactionId })
            .timestamp(timestamp + 50),
          log
            .create()
            .message('Cart total exceeds threshold, applying discount logic')
            .logLevel('warning')
            .service('synth-traces-frontend')
            .defaults({ 'trace.id': traceId, 'span.id': transactionId })
            .timestamp(timestamp + 150),
        ]);

      return [withClient(apmEsClient, apmIterable), withClient(logsEsClient, logIterable)];
    },
  };
};

export default scenario;
