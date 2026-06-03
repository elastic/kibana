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
  ServiceEdge,
  ServiceFailure,
  ServiceErrorType,
  ServiceGraph,
  ServiceNode,
} from '../types';
import { ERROR_TYPE_STATUS, isInfraErrorType } from '../types';
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
import { getOrBuildMetadata, type MetadataCache } from '../utils/metadata';
import { buildLogDoc, resolveLogLevel } from './shared';
import {
  pickHealthyMessage,
  pickErrorMessage,
  pickWarnMessage,
  pickOutboundMessage,
  getStackTrace,
} from '../utils/templates';

const AMBIENT_ERROR_RATE = 0.01;

interface DownstreamOutcome {
  edge: ServiceEdge;
  targetLabel: string;
  errored: boolean;
  childHttpStatus: number;
  docs: Array<Partial<LogDocument>>;
}

interface ErrorContext {
  isError: boolean;
  httpStatus: number;
  errorType: ServiceErrorType;
  sourceDep: ServiceFailure['sourceDep'];
  overrides: Record<string, string>;
  isInfraKill: boolean;
}

type Metadata = Record<string, string | undefined>;

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

function resolveErrorContext(
  directError: boolean,
  directFailConf: ServiceFailure | undefined,
  failedDownstreams: DownstreamOutcome[],
  serviceNode: ServiceNode,
  rng: () => number
): ErrorContext {
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

export function simulateRequest({
  serviceGraph,
  entryService,
  rng,
  resolvedFailures,
  stableSeed,
  tickSeed,
  metadataCache,
}: {
  serviceGraph: ServiceGraph;
  entryService: string;
  rng: () => number;
  resolvedFailures: Record<string, ServiceFailure> | undefined;
  stableSeed: number;
  tickSeed: number;
  metadataCache?: MetadataCache;
}): Array<Partial<LogDocument>> {
  function visit(
    current: string,
    path: ReadonlySet<string> = new Set()
  ): {
    errored: boolean;
    httpStatus: number;
    docs: Array<Partial<LogDocument>>;
  } {
    if (path.has(current)) {
      return { errored: false, httpStatus: 200, docs: [] };
    }
    const childPath = new Set(path);
    childPath.add(current);

    const serviceNode = serviceGraph.services.find((s) => s.name === current);
    if (!serviceNode) {
      throw new Error(`simulateRequest: unknown service "${current}"`);
    }

    const svcSeed = deriveSeed(stableSeed, current);
    const svcTickSeed = deriveSeed(tickSeed, current);
    const metadata = getOrBuildMetadata(serviceNode, svcSeed, metadataCache);

    // Failure roll
    const directFailConf = resolvedFailures?.[current];
    const errorRate = directFailConf ? directFailConf.rate ?? 1 : AMBIENT_ERROR_RATE;
    const directError = rng() < errorRate;
    const isFailing = directFailConf !== undefined && errorRate > 0;
    const emitWarn = !directError && isFailing && resolveLogLevel(isFailing, rng) === 'warn';

    // Visit downstream
    const downstreamOutcomes: DownstreamOutcome[] =
      !directError || rng() < DOWNSTREAM_ATTEMPT_ON_ERROR_PROB
        ? serviceGraph.edges
            .filter((e) => e.source === current)
            .map((edge) => {
              const { errored, httpStatus: childHttpStatus, docs } = visit(edge.target, childPath);
              const targetNode = serviceGraph.services.find((s) => s.name === edge.target);
              return {
                edge,
                targetLabel: targetNode?.displayName ?? edge.target,
                errored,
                childHttpStatus,
                docs,
              };
            })
        : [];

    // Resolve error context
    const failedDownstreams = downstreamOutcomes.filter(
      (o) => o.errored && !ASYNC_PROTOCOLS.has(o.edge.protocol)
    );
    const { isError, httpStatus, errorType, sourceDep, overrides, isInfraKill } =
      resolveErrorContext(directError, directFailConf, failedDownstreams, serviceNode, rng);

    // Select message
    const stackTrace =
      isError && errorType === 'internal_error' && !isInfraKill
        ? getStackTrace({
            runtime: serviceNode.runtime,
            seed: svcSeed,
            serviceName: serviceNode.name,
          })
        : '';
    const message =
      stackTrace ||
      (isError
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
          }));

    // Build docs
    const docCount = isError ? (directError ? directFailConf?.multiplier ?? 1 : 1) : 1;
    const selfLogs = buildSelfLogs({
      serviceNode,
      level: isError ? 'error' : 'info',
      message,
      docCount,
      metadata,
    });
    const warnLog =
      emitWarn && directFailConf
        ? buildLogDoc({
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
          })
        : undefined;
    const outboundLogs = buildOutboundLogs({
      serviceNode,
      outcomes: downstreamOutcomes,
      svcSeed,
      svcTickSeed,
      metadata,
      rng,
    });

    return {
      errored: isError,
      httpStatus,
      docs: [
        ...downstreamOutcomes.flatMap((o) => o.docs),
        ...selfLogs,
        ...(warnLog ? [warnLog] : []),
        ...outboundLogs,
      ],
    };
  }

  const { docs } = visit(entryService);
  return docs;
}
