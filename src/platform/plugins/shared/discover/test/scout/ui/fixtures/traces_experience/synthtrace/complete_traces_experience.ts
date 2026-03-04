/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a rich set of trace data for E2E testing of the traces experience
 * in Discover and APM. The data covers:
 *
 * 1. Rich trace ("GET /checkout") — transaction with errors, spans with destination/span links
 *    - Transaction itself
 *      → 2 APM errors (linked via transaction.id) + 2 correlated error logs + 1 info log
 *    - DB span with `span.destination.service.resource` (dependency link)
 *      → 1 APM error + 1 correlated error log
 *    - Internal span with span links
 *      → 3 correlated info logs (non-error)
 *
 * 2. Minimal trace ("GET /health") — transaction + DB span only
 *    - No errors, no logs, no span links
 *
 * 3. Producer trace ("Background job") — provides the span link target
 *    - Kafka messaging span with destination
 *
 * Services:
 *   - synth-traces-frontend (nodejs) — main service
 *   - synth-traces-backend  (go)     — dependency / producer service
 */

import type {
  ApmFields,
  LogDocument,
  Serializable,
  SynthtraceGenerator,
} from '@kbn/synthtrace-client';
import { apm, log, timerange } from '@kbn/synthtrace-client';
import { RICH_TRACE, MINIMAL_TRACE, PRODUCER_TRACE } from '../constants';

const FRONTEND_SERVICE = 'synth-traces-frontend';
const BACKEND_SERVICE = 'synth-traces-backend';
const ENVIRONMENT = 'production';

interface TraceCorrelationIds {
  richTraceId: string;
  transactionId: string;
  dbSpanId: string;
  processOrderSpanId: string;
}

interface RichTraceResult {
  apmData: SynthtraceGenerator<ApmFields>;
  correlationIds: TraceCorrelationIds;
}

export function richTrace({ from, to }: { from: number; to: number }): RichTraceResult {
  const frontend = apm
    .service({ name: FRONTEND_SERVICE, environment: ENVIRONMENT, agentName: 'nodejs' })
    .instance('frontend-1');

  const backend = apm
    .service({ name: BACKEND_SERVICE, environment: ENVIRONMENT, agentName: 'go' })
    .instance('backend-1');

  // --- Trace 3: Producer (generates span link targets) ---
  const producerEvents = Array.from(
    timerange(from, to)
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        backend
          .transaction({ transactionName: PRODUCER_TRACE.TRANSACTION_NAME })
          .timestamp(timestamp)
          .duration(200)
          .success()
          .children(
            backend
              .span({
                spanName: 'Publish to kafka/orders',
                spanType: 'messaging',
                spanSubtype: 'kafka',
              })
              .destination('kafka/orders')
              .timestamp(timestamp + 10)
              .duration(50)
              .success()
          )
      )
  );

  const producerFields = producerEvents.flatMap((e) => e.serialize());
  const producerSpan = producerFields.find((e) => e['processor.event'] === 'span');
  const producerSpanLink = {
    trace: { id: producerSpan!['trace.id']! },
    span: { id: producerSpan!['span.id']! },
  };

  // --- Trace 1: Rich trace ---
  const richTraceEvents = Array.from(
    timerange(from, to)
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        // Transaction → 2 APM errors + 2 correlated error logs + 1 info log
        frontend
          .transaction({ transactionName: RICH_TRACE.TRANSACTION_NAME })
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .children(
            // DB span with destination → dependency link to APM + 1 APM error + 1 error log
            frontend
              .span({
                spanName: RICH_TRACE.DB_SPAN_NAME,
                spanType: 'db',
                spanSubtype: 'postgresql',
              })
              .destination('postgresql')
              .timestamp(timestamp + 10)
              .duration(300)
              .success(),
            // Internal span with span links → correlated info logs
            frontend
              .span({
                spanName: RICH_TRACE.INTERNAL_SPAN_NAME,
                spanType: 'app',
                spanSubtype: 'internal',
              })
              .defaults({ 'span.links': [producerSpanLink] })
              .timestamp(timestamp + 310)
              .duration(400)
              .success()
          )
      )
  );

  // Extract IDs from the serialized trace
  const richFields = richTraceEvents.flatMap((e) => e.serialize());
  const richTransaction = richFields.find((e) => e['processor.event'] === 'transaction');
  const dbSpan = richFields.find(
    (e) => e['processor.event'] === 'span' && e['span.name'] === RICH_TRACE.DB_SPAN_NAME
  );
  const processOrderSpan = richFields.find(
    (e) => e['processor.event'] === 'span' && e['span.name'] === RICH_TRACE.INTERNAL_SPAN_NAME
  );

  const traceId = richTransaction!['trace.id']!;
  const transactionId = richTransaction!['transaction.id']!;

  const correlationIds: TraceCorrelationIds = {
    richTraceId: traceId,
    transactionId,
    dbSpanId: dbSpan!['span.id']!,
    processOrderSpanId: processOrderSpan!['span.id']!,
  };

  // --- Create APM errors ---
  // - parent.id + span.id: link to item in classic/unified waterfalls
  // - error.grouping_key: required field for APM error documents
  const createError = (
    message: string,
    type: string,
    itemId: string,
    timestamp: number
  ): ApmFields => {
    const error = frontend.error({ message, type });
    error.fields['trace.id'] = traceId;
    error.fields['transaction.id'] = transactionId;
    error.fields['transaction.name'] = RICH_TRACE.TRANSACTION_NAME;
    error.fields['transaction.type'] = 'request';
    error.fields['parent.id'] = itemId;
    error.fields['span.id'] = itemId;
    error.fields['error.grouping_key'] = `${type}-${itemId}`;
    return error.timestamp(timestamp).serialize()[0];
  };

  // 2 errors on transaction, 1 error on DB span
  const errorEvents: ApmFields[] = [
    createError(RICH_TRACE.ERRORS.TRANSACTION_DB_ERROR, 'DatabaseError', transactionId, from + 100),
    createError(
      RICH_TRACE.ERRORS.TRANSACTION_VALIDATION_ERROR,
      'ValidationError',
      transactionId,
      from + 200
    ),
    createError(
      RICH_TRACE.ERRORS.DB_SPAN_TIMEOUT,
      'QueryTimeoutError',
      correlationIds.dbSpanId,
      from + 310
    ),
  ];

  // --- Trace 2: Minimal trace (no errors, no logs, no span links) ---
  const minimalTraceEvents = Array.from(
    timerange(from, to)
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        frontend
          .transaction({ transactionName: MINIMAL_TRACE.TRANSACTION_NAME })
          .timestamp(timestamp)
          .duration(100)
          .success()
          .children(
            frontend
              .span({
                spanName: 'SELECT 1',
                spanType: 'db',
                spanSubtype: 'postgresql',
              })
              .destination('postgresql')
              .timestamp(timestamp + 5)
              .duration(20)
              .success()
          )
      )
  );

  const wrapEvents = (events: Array<Serializable<ApmFields>>) =>
    events
      .flatMap((e) => e.serialize())
      .map(
        (fields) =>
          ({
            fields,
            serialize: () => [fields],
          } as Serializable<ApmFields>)
      );

  const wrapFields = (fields: ApmFields[]) =>
    fields.map(
      (f) =>
        ({
          fields: f,
          serialize: () => [f],
        } as Serializable<ApmFields>)
    );

  const allEvents = [
    ...wrapEvents(producerEvents),
    ...wrapEvents(richTraceEvents),
    ...wrapFields(errorEvents),
    ...wrapEvents(minimalTraceEvents),
  ];

  function* apmGenerator(): SynthtraceGenerator<ApmFields> {
    yield* allEvents;
  }

  return {
    apmData: apmGenerator(),
    correlationIds,
  };
}

/**
 * Generates log entries correlated to the rich trace.
 *
 * - Transaction   → 2 error logs + 1 info log (tests "transaction with mixed related logs")
 * - DB span       → 1 error log  (tests "span with one related error log")
 * - Process order → 3 info logs  (tests "span with related logs", non-error)
 */
export function traceCorrelatedLogs({
  from,
  to,
  traceId,
  transactionId,
  dbSpanId,
  processOrderSpanId,
}: {
  from: number;
  to: number;
  traceId: string;
  transactionId: string;
  dbSpanId: string;
  processOrderSpanId: string;
}): SynthtraceGenerator<LogDocument> {
  return timerange(from, to)
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      // Transaction: correlated error + info logs
      log
        .create()
        .message(RICH_TRACE.LOGS.TRANSACTION_DB_ERROR)
        .logLevel('error')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': transactionId })
        .timestamp(timestamp + 100),
      log
        .create()
        .message(RICH_TRACE.LOGS.TRANSACTION_VALIDATION_ERROR)
        .logLevel('error')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': transactionId })
        .timestamp(timestamp + 200),
      log
        .create()
        .message(RICH_TRACE.LOGS.TRANSACTION_INFO)
        .logLevel('info')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': transactionId })
        .timestamp(timestamp + 50),

      // DB span: 1 related error log
      log
        .create()
        .message(RICH_TRACE.LOGS.DB_SPAN_TIMEOUT)
        .logLevel('error')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': dbSpanId })
        .timestamp(timestamp + 300),

      // Process order span: related info logs (non-error)
      log
        .create()
        .message(RICH_TRACE.LOGS.PROCESS_ORDER_VALIDATING)
        .logLevel('info')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': processOrderSpanId })
        .timestamp(timestamp + 510),
      log
        .create()
        .message(RICH_TRACE.LOGS.PROCESS_ORDER_INVENTORY)
        .logLevel('info')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': processOrderSpanId })
        .timestamp(timestamp + 700),
      log
        .create()
        .message(RICH_TRACE.LOGS.PROCESS_ORDER_SUCCESS)
        .logLevel('info')
        .service(FRONTEND_SERVICE)
        .defaults({ 'trace.id': traceId, 'span.id': processOrderSpanId })
        .timestamp(timestamp + 900),
    ]);
}
