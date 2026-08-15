/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { httpExitSpan } from '@kbn/synthtrace-client';
import type { InfraDependency, Protocols, SpanRecord } from './types';

type ApmTransaction = ReturnType<Instance['transaction']>;
type ApmSpan = ReturnType<Instance['span']>;

const EDGE_PROTOCOL_TO_SPAN: Record<
  Protocols,
  (instance: Instance, targetName: string, httpStatus: number) => ApmSpan
> = {
  http: (instance, targetName, httpStatus) =>
    instance.span(
      httpExitSpan({
        spanName: `POST http://${targetName}:3000`,
        destinationUrl: `http://${targetName}:3000`,
        method: 'POST',
        statusCode: httpStatus,
      })
    ),
  grpc: (instance, targetName, httpStatus) =>
    instance.span(
      httpExitSpan({
        spanName: `POST http://${targetName}:3000`,
        destinationUrl: `http://${targetName}:3000`,
        method: 'POST',
        statusCode: httpStatus,
      })
    ),
  kafka: (instance, targetName) =>
    instance.span({ spanName: `send ${targetName}`, spanType: 'messaging', spanSubtype: 'kafka' }),
};

const INFRA_DEP_TO_SPAN: Record<InfraDependency, (instance: Instance) => ApmSpan> = {
  postgres: (instance) =>
    instance.span({ spanName: 'SELECT', spanType: 'db', spanSubtype: 'postgresql' }),
  mongodb: (instance) =>
    instance.span({ spanName: 'query', spanType: 'db', spanSubtype: 'mongodb' }),
  elasticsearch: (instance) =>
    instance.span({
      spanName: 'GET _search',
      spanType: 'db',
      spanSubtype: 'elasticsearch',
      'service.target.type': 'elasticsearch',
      'span.destination.service.resource': 'elasticsearch',
    }),
  kafka: (instance) =>
    instance.span({ spanName: 'poll', spanType: 'messaging', spanSubtype: 'kafka' }),
  redis: (instance) =>
    instance.span({
      spanName: 'GET',
      spanType: 'db',
      spanSubtype: 'redis',
      'service.target.type': 'redis',
      'span.destination.service.resource': 'redis',
    }),
};

interface WalkContext {
  apmInstances: Map<string, Instance>;
  timestamp: number;
  serviceLabels: Map<string, string>;
}

function walkSpanTree(span: SpanRecord, ctx: WalkContext): ApmTransaction | undefined {
  const instance = ctx.apmInstances.get(span.service);
  if (!instance) return undefined;

  const childSpans: ApmSpan[] = [];

  for (const child of span.children) {
    const spanBuilder = EDGE_PROTOCOL_TO_SPAN[child.protocol];
    if (!spanBuilder) continue;
    const targetLabel = ctx.serviceLabels.get(child.service) ?? child.service;
    const exitSpan = spanBuilder(instance, targetLabel, child.httpStatus)
      .timestamp(ctx.timestamp)
      .duration(child.durationMs || span.durationMs);
    if (child.isError) {
      exitSpan.failure();
    } else {
      exitSpan.success();
    }
    const childTx = walkSpanTree(child, ctx);
    if (childTx) {
      exitSpan.children(childTx);
    }
    childSpans.push(exitSpan);
  }

  for (const { dep, durationMs, isError } of span.infraDeps) {
    const depSpanBuilder = INFRA_DEP_TO_SPAN[dep];
    if (!depSpanBuilder) continue;
    const depSpan = depSpanBuilder(instance).timestamp(ctx.timestamp).duration(durationMs);
    if (isError) {
      depSpan.failure();
    } else {
      depSpan.success();
    }
    childSpans.push(depSpan);
  }

  const tx = instance
    .transaction({ transactionName: span.operation })
    .timestamp(ctx.timestamp)
    .duration(span.durationMs);
  if (span.isError) {
    tx.failure();
  } else {
    tx.success();
  }
  if (childSpans.length > 0) {
    tx.children(...childSpans);
  }

  return tx;
}

/** Walks a SpanRecord tree and builds APM Transaction/Span objects, then serializes. */
export const buildApmTrace = ({
  rootSpan,
  apmInstances,
  timestamp,
  serviceLabels,
}: {
  rootSpan: SpanRecord;
  apmInstances: Map<string, Instance>;
  timestamp: number;
  serviceLabels: Map<string, string>;
}): ApmFields[] => {
  const rootTx = walkSpanTree(rootSpan, { apmInstances, timestamp, serviceLabels });
  return rootTx ? rootTx.serialize() : [];
};
