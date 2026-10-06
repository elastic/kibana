/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import type {
  RequestResult,
  ServiceEdge,
  ServiceFailure,
  ServiceErrorType,
  ServiceGraph,
  ServiceNamesOf,
  ServiceNode,
  ServiceStats,
  SpanRecord,
} from '../types';
import { ERROR_TYPE_STATUS, isInfraErrorType } from '../types';
import type { Protocols } from '../constants';
import {
  ASYNC_PROTOCOLS,
  DOWNSTREAM_ATTEMPT_ON_ERROR_PROB,
  ERROR_LATENCY_BASE_MS,
  ERROR_LATENCY_JITTER_MS,
  HTTP_200_PROB,
  SUCCESS_LATENCY_BASE_MS,
  SUCCESS_LATENCY_JITTER_MS,
} from '../constants';
import { deriveSeed } from '../utils/seed';
import { mulberry32 } from '../placeholders';
import { getOrBuildMetadata, type MetadataCache } from '../utils/metadata';
import { buildLogDoc } from '../log_builder';
import { resolveLogLevel } from './shared';
import {
  pickHealthyMessage,
  pickErrorMessage,
  pickWarnMessage,
  pickOutboundMessage,
  getStackTrace,
} from '../utils/templates';

const AMBIENT_ERROR_RATE = 0.01;
const INFRA_SPAN_BASE_MS = 5;
const INFRA_SPAN_JITTER_MS = 45;
const DURATION_SEED_OFFSET = 0x44555221;

interface DownstreamOutcome {
  edge: ServiceEdge;
  targetLabel: string;
  errored: boolean;
  childHttpStatus: number;
  docs: Array<Partial<LogDocument>>;
  spanRecord: SpanRecord;
  durationMs: number;
  serviceStats: Record<string, ServiceStats>;
}

interface ErrorContext {
  isError: boolean;
  httpStatus: number;
  errorType: ServiceErrorType;
  sourceDep: ServiceFailure['sourceDep'];
  overrides: Record<string, string>;
  isInfraKill: boolean;
}

interface VisitResult {
  errored: boolean;
  httpStatus: number;
  docs: Array<Partial<LogDocument>>;
  spanRecord: SpanRecord;
  durationMs: number;
  serviceStats: Record<string, ServiceStats>;
}

type Metadata = Record<string, string | undefined>;

const EMPTY_SPAN_RECORD: SpanRecord = {
  service: '',
  operation: '',
  durationMs: 0,
  isError: false,
  httpStatus: 200,
  protocol: 'http',
  infraDeps: [],
  children: [],
};

function mergeServiceStats(
  ...statsList: Array<Record<string, ServiceStats>>
): Record<string, ServiceStats> {
  const merged: Record<string, ServiceStats> = {};
  for (const stats of statsList) {
    for (const [svcName, s] of Object.entries(stats)) {
      if (!merged[svcName]) {
        merged[svcName] = { requests: 0, errors: 0, totalLatencyUs: 0 };
      }
      merged[svcName].requests += s.requests;
      merged[svcName].errors += s.errors;
      merged[svcName].totalLatencyUs += s.totalLatencyUs;
    }
  }
  return merged;
}

function buildSelfLogs({
  serviceNode,
  level,
  message,
  docCount,
  metadata,
}: {
  serviceNode: ServiceNode;
  level: 'info' | 'error';
  message: string;
  docCount: number;
  metadata: Metadata;
}): Array<Partial<LogDocument>> {
  return Array.from({ length: docCount }, () =>
    buildLogDoc({ service: serviceNode, level, message, metadata })
  );
}

function buildOutboundLogs({
  serviceNode,
  outcomes,
  svcSeed,
  svcTickSeed,
  metadata,
  rng,
}: {
  serviceNode: ServiceNode;
  outcomes: DownstreamOutcome[];
  svcSeed: number;
  svcTickSeed: number;
  metadata: Metadata;
  rng: () => number;
}): Array<Partial<LogDocument>> {
  return outcomes.map(({ edge, targetLabel, errored, childHttpStatus }) => {
    const latency = errored
      ? ERROR_LATENCY_BASE_MS + Math.floor(rng() * ERROR_LATENCY_JITTER_MS)
      : SUCCESS_LATENCY_BASE_MS + Math.floor(rng() * SUCCESS_LATENCY_JITTER_MS);
    const { message, level } = pickOutboundMessage({
      seed: deriveSeed(svcSeed, edge.target),
      tickSeed: deriveSeed(svcTickSeed, edge.target),
      runtime: serviceNode.runtime,
      serviceName: serviceNode.name,
      targetService: targetLabel,
      protocol: edge.protocol,
      httpStatus: ASYNC_PROTOCOLS.has(edge.protocol) ? 200 : childHttpStatus,
      latencyMs: latency,
    });
    return buildLogDoc({ service: serviceNode, level, message, metadata });
  });
}

function resolveErrorContext({
  directError,
  directFailConf,
  failedDownstreams,
  serviceNode,
  rng,
}: {
  directError: boolean;
  directFailConf: ServiceFailure | undefined;
  failedDownstreams: DownstreamOutcome[];
  serviceNode: ServiceNode;
  rng: () => number;
}): ErrorContext {
  const cascadeError = !directError && failedDownstreams.length > 0 && !serviceNode.resilient;
  const isError = directError || cascadeError;

  const directType = directFailConf?.errorType ?? 'internal_error';
  const errorType: ServiceErrorType = directError
    ? isInfraErrorType(directType)
      ? 'internal_error'
      : (directType as ServiceErrorType)
    : failedDownstreams.some((o) => o.childHttpStatus === ERROR_TYPE_STATUS.gateway_timeout)
    ? 'gateway_timeout'
    : 'bad_gateway';

  const sourceDep = directError ? directFailConf?.sourceDep : undefined;

  const cascadeOverrides: Record<string, string> =
    cascadeError && failedDownstreams[0]
      ? {
          upstream_host: failedDownstreams[0].targetLabel,
          upstream_status: String(failedDownstreams[0].childHttpStatus),
        }
      : {};

  const httpStatus = isError ? ERROR_TYPE_STATUS[errorType] : rng() < HTTP_200_PROB ? 200 : 201;

  const isInfraKill =
    directError && directFailConf != null && isInfraErrorType(directFailConf.errorType);

  return {
    isError,
    httpStatus,
    errorType,
    sourceDep,
    overrides: { status: String(httpStatus), ...cascadeOverrides },
    isInfraKill,
  };
}

function resolveMessage({
  errorCtx,
  serviceNode,
  svcSeed,
  svcTickSeed,
  directError,
}: {
  errorCtx: ErrorContext;
  serviceNode: ServiceNode;
  svcSeed: number;
  svcTickSeed: number;
  directError: boolean;
}): string {
  const { isError, errorType, isInfraKill, sourceDep, overrides } = errorCtx;

  if (isError && errorType === 'internal_error' && !isInfraKill) {
    const stackTrace = getStackTrace({
      runtime: serviceNode.runtime,
      seed: svcSeed,
      serviceName: serviceNode.name,
    });
    if (stackTrace) return stackTrace;
  }

  return isError
    ? pickErrorMessage({
        errorType,
        seed: svcSeed,
        tickSeed: svcTickSeed,
        runtime: serviceNode.runtime,
        serviceName: serviceNode.name,
        overrides,
        sourceDep,
        overridePool: directError ? serviceNode.serviceLogs?.error : undefined,
      })
    : pickHealthyMessage({
        seed: svcSeed,
        tickSeed: svcTickSeed,
        runtime: serviceNode.runtime,
        serviceName: serviceNode.name,
        overrides,
        infraDeps: serviceNode.infraDeps,
        overridePool: serviceNode.serviceLogs?.success,
      });
}

function buildWarnLog({
  emitWarn,
  directFailConf,
  serviceNode,
  svcSeed,
  svcTickSeed,
  metadata,
}: {
  emitWarn: boolean;
  directFailConf: ServiceFailure | undefined;
  serviceNode: ServiceNode;
  svcSeed: number;
  svcTickSeed: number;
  metadata: Metadata;
}): Partial<LogDocument> | undefined {
  if (!emitWarn || !directFailConf) return undefined;
  return buildLogDoc({
    service: serviceNode,
    level: 'warn',
    message: pickWarnMessage({
      errorType: isInfraErrorType(directFailConf.errorType)
        ? 'internal_error'
        : directFailConf.errorType,
      seed: svcSeed,
      tickSeed: svcTickSeed,
      runtime: serviceNode.runtime,
      serviceName: serviceNode.name,
      sourceDep: directFailConf.sourceDep,
    }),
    metadata,
  });
}

function computeSpanTiming({
  svcTickSeed,
  current,
  isError,
  downstreamOutcomes,
  serviceNode,
  directFailConf,
}: {
  svcTickSeed: number;
  current: string;
  isError: boolean;
  downstreamOutcomes: DownstreamOutcome[];
  serviceNode: ServiceNode;
  directFailConf: ServiceFailure | undefined;
}): { totalDurationMs: number; infraDepRecords: SpanRecord['infraDeps'] } {
  const durationRng = mulberry32(
    deriveSeed(svcTickSeed, `${current}:duration`) + DURATION_SEED_OFFSET
  );
  const selfProcessingMs = isError
    ? ERROR_LATENCY_BASE_MS + Math.floor(durationRng() * ERROR_LATENCY_JITTER_MS)
    : SUCCESS_LATENCY_BASE_MS + Math.floor(durationRng() * SUCCESS_LATENCY_JITTER_MS);
  const downstreamDurationMs = downstreamOutcomes.reduce((sum, o) => sum + o.durationMs, 0);
  const totalDurationMs = selfProcessingMs + downstreamDurationMs;

  const infraDepRecords = serviceNode.infraDeps.map((dep) => {
    const depDurationMs = INFRA_SPAN_BASE_MS + Math.floor(durationRng() * INFRA_SPAN_JITTER_MS);
    return {
      dep,
      durationMs: depDurationMs,
      isError: isError && directFailConf?.sourceDep === dep,
    };
  });

  return { totalDurationMs, infraDepRecords };
}

function toDownstreamOutcome(
  edge: ServiceEdge,
  childResult: VisitResult,
  services: readonly ServiceNode[]
): DownstreamOutcome {
  const targetNode = services.find((s) => s.name === edge.target);
  return {
    edge,
    targetLabel: targetNode?.displayName ?? edge.target,
    errored: childResult.errored,
    childHttpStatus: childResult.httpStatus,
    docs: childResult.docs,
    spanRecord: childResult.spanRecord,
    durationMs: childResult.durationMs,
    serviceStats: childResult.serviceStats,
  };
}

function buildSpanRecord({
  service,
  entryService,
  isError,
  httpStatus,
  protocol,
  durationMs,
  infraDeps,
  children,
}: {
  service: string;
  entryService: string;
  isError: boolean;
  httpStatus: number;
  protocol: Protocols;
  durationMs: number;
  infraDeps: SpanRecord['infraDeps'];
  children: SpanRecord[];
}): SpanRecord {
  return {
    service,
    operation: `${entryService} request`,
    durationMs,
    isError,
    httpStatus,
    protocol,
    infraDeps,
    children,
  };
}

function buildVisitLogDocs({
  serviceNode,
  errorCtx,
  directError,
  directFailConf,
  emitWarn,
  svcSeed,
  svcTickSeed,
  metadata,
  downstreamOutcomes,
  rng,
}: {
  serviceNode: ServiceNode;
  errorCtx: ErrorContext;
  directError: boolean;
  directFailConf: ServiceFailure | undefined;
  emitWarn: boolean;
  svcSeed: number;
  svcTickSeed: number;
  metadata: Metadata;
  downstreamOutcomes: DownstreamOutcome[];
  rng: () => number;
}): Array<Partial<LogDocument>> {
  const message = resolveMessage({ errorCtx, serviceNode, svcSeed, svcTickSeed, directError });
  const docCount = errorCtx.isError ? (directError ? directFailConf?.multiplier ?? 1 : 1) : 1;
  const selfLogs = buildSelfLogs({
    serviceNode,
    level: errorCtx.isError ? 'error' : 'info',
    message,
    docCount,
    metadata,
  });
  const warnLog = buildWarnLog({
    emitWarn,
    directFailConf,
    serviceNode,
    svcSeed,
    svcTickSeed,
    metadata,
  });
  const outboundLogs = buildOutboundLogs({
    serviceNode,
    outcomes: downstreamOutcomes,
    svcSeed,
    svcTickSeed,
    metadata,
    rng,
  });
  return [
    ...downstreamOutcomes.flatMap((o) => o.docs),
    ...selfLogs,
    ...(warnLog ? [warnLog] : []),
    ...outboundLogs,
  ];
}

function assembleVisitResult({
  current,
  entryService,
  errorCtx,
  incomingProtocol,
  totalDurationMs,
  infraDepRecords,
  docs,
  downstreamOutcomes,
}: {
  current: string;
  entryService: string;
  errorCtx: ErrorContext;
  incomingProtocol: Protocols;
  totalDurationMs: number;
  infraDepRecords: SpanRecord['infraDeps'];
  docs: Array<Partial<LogDocument>>;
  downstreamOutcomes: DownstreamOutcome[];
}): VisitResult {
  const serviceStats = mergeServiceStats(
    {
      [current]: {
        requests: 1,
        errors: errorCtx.isError ? 1 : 0,
        totalLatencyUs: totalDurationMs * 1000,
      },
    },
    ...downstreamOutcomes.map((o) => o.serviceStats)
  );

  const spanRecord = buildSpanRecord({
    service: current,
    entryService,
    isError: errorCtx.isError,
    httpStatus: errorCtx.httpStatus,
    protocol: incomingProtocol,
    durationMs: totalDurationMs,
    infraDeps: infraDepRecords,
    children: downstreamOutcomes.map((o) => o.spanRecord),
  });

  return {
    errored: errorCtx.isError,
    httpStatus: errorCtx.httpStatus,
    docs,
    spanRecord,
    durationMs: totalDurationMs,
    serviceStats,
  };
}

const cyclicVisitResult = (service: string): VisitResult => ({
  errored: false,
  httpStatus: 200,
  docs: [],
  spanRecord: { ...EMPTY_SPAN_RECORD, service },
  durationMs: 0,
  serviceStats: {},
});

export function simulateRequest<TServiceGraph extends ServiceGraph>({
  serviceGraph,
  entryService,
  rng,
  resolvedFailures,
  stableSeed,
  tickSeed,
  metadataCache,
}: {
  serviceGraph: TServiceGraph;
  entryService: ServiceNamesOf<TServiceGraph>;
  rng: () => number;
  resolvedFailures: Record<string, ServiceFailure> | undefined;
  stableSeed: number;
  tickSeed: number;
  metadataCache?: MetadataCache;
}): RequestResult {
  function visit(
    current: string,
    path: ReadonlySet<string> = new Set(),
    incomingProtocol: Protocols = 'http'
  ): VisitResult {
    if (path.has(current)) return cyclicVisitResult(current);
    const childPath = new Set(path);
    childPath.add(current);

    const serviceNode = serviceGraph.services.find((s) => s.name === current);
    if (!serviceNode) {
      throw new Error(`simulateRequest: unknown service "${current}"`);
    }

    const svcSeed = deriveSeed(stableSeed, current);
    const svcTickSeed = deriveSeed(tickSeed, current);
    const metadata = getOrBuildMetadata(serviceNode, svcSeed, metadataCache);

    const directFailConf = resolvedFailures?.[current];
    const errorRate = directFailConf ? directFailConf.rate ?? 1 : AMBIENT_ERROR_RATE;
    const directError = rng() < errorRate;
    const isFailing = directFailConf !== undefined && errorRate > 0;
    const emitWarn = !directError && isFailing && resolveLogLevel(isFailing, rng) === 'warn';

    const downstreamOutcomes: DownstreamOutcome[] =
      !directError || rng() < DOWNSTREAM_ATTEMPT_ON_ERROR_PROB
        ? serviceGraph.edges
            .filter((e) => e.source === current)
            .map((edge) =>
              toDownstreamOutcome(
                edge,
                visit(edge.target, childPath, edge.protocol),
                serviceGraph.services
              )
            )
        : [];
    const failedDownstreams = downstreamOutcomes.filter(
      (o) => o.errored && !ASYNC_PROTOCOLS.has(o.edge.protocol)
    );

    const errorCtx = resolveErrorContext({
      directError,
      directFailConf,
      failedDownstreams,
      serviceNode,
      rng,
    });
    const docs = buildVisitLogDocs({
      serviceNode,
      errorCtx,
      directError,
      directFailConf,
      emitWarn,
      svcSeed,
      svcTickSeed,
      metadata,
      downstreamOutcomes,
      rng,
    });
    const { totalDurationMs, infraDepRecords } = computeSpanTiming({
      svcTickSeed,
      current,
      isError: errorCtx.isError,
      downstreamOutcomes,
      serviceNode,
      directFailConf,
    });

    return assembleVisitResult({
      current,
      entryService,
      errorCtx,
      incomingProtocol,
      totalDurationMs,
      infraDepRecords,
      docs,
      downstreamOutcomes,
    });
  }

  const { docs, spanRecord, serviceStats } = visit(entryService);
  return { docs, rootSpan: spanRecord, serviceStats };
}
