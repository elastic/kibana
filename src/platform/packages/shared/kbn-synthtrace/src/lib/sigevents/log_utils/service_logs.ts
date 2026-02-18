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
  FailureMap,
  GeneratorOptions,
  ServiceEdge,
  ServiceFailure,
  ServiceErrorType,
  ServiceGraph,
} from '../types';
import { ERROR_TYPE_STATUS, isInfraErrorType } from '../types';
import { ASYNC_PROTOCOLS } from '../constants';
import { mulberry32 } from '../placeholders';
import { resolveEffectiveSeed, serviceStableSeed } from '../utils/seed';
import { getOrBuildMetadata, type MetadataCache } from '../utils/metadata';
import { buildLogDoc } from './shared';
import { resolveServiceFailures } from '../utils/failure';

import {
  pickHealthyMessage,
  pickErrorMessage,
  pickWarnMessage,
  pickOutboundMessages,
  getStackTrace,
} from '../utils/templates';

// Low ambient error floor applied to services with no explicit FailureMap entry.
const AMBIENT_ERROR_RATE = 0.01;
// Warn docs fire at this fraction of the configured failure rate on non-error ticks.
const WARN_RATE_FRACTION = 0.6;

export interface RequestDocsOptions extends GeneratorOptions {
  serviceGraph: ServiceGraph;
  entryService: string;
  metadataCache?: MetadataCache;
  index?: number;
  failures?: FailureMap;
  correlationId?: string;
}

function simulateRequest({
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
  const docs: Array<Partial<LogDocument>> = [];
  const visited = new Set<string>();

  // Returns the service's error state and its own HTTP status code.
  function visit(current: string): { errored: boolean; httpStatus: number } {
    if (visited.has(current)) return { errored: false, httpStatus: 200 };
    visited.add(current);

    const serviceNode = serviceGraph.services.find((s) => s.name === current);
    if (!serviceNode) return { errored: false, httpStatus: 200 };

    const svcSeed = serviceStableSeed(stableSeed, current);
    const svcTickSeed = serviceStableSeed(tickSeed, current);

    const metadata =
      metadataCache != null
        ? getOrBuildMetadata(serviceNode, svcSeed, metadataCache)
        : getOrBuildMetadata(serviceNode, svcSeed);

    const directFailConf = resolvedFailures?.[current];
    // Explicit FailureMap rate takes precedence over the ambient floor when higher.
    const effectiveRate = Math.max(AMBIENT_ERROR_RATE, directFailConf?.rate ?? 0);
    const directError = rng() < effectiveRate;
    // Warn fires on non-error ticks only when there is an active failure configured.
    const emitWarn =
      !directError &&
      effectiveRate > AMBIENT_ERROR_RATE &&
      rng() < effectiveRate * WARN_RATE_FRACTION;

    const attemptsDownstream = !directError || rng() < 0.3;
    const downstream = serviceGraph.edges.filter((e) => e.source === current);
    const downstreamOutcomes: Array<{
      edge: ServiceEdge;
      errored: boolean;
      childHttpStatus: number;
    }> = [];
    if (attemptsDownstream) {
      for (const edge of downstream) {
        const { errored: childErrored, httpStatus: childHttpStatus } = visit(edge.target);
        downstreamOutcomes.push({ edge, errored: childErrored, childHttpStatus });
      }
    }

    // Cascade: downstream failure propagates unless the service is marked resilient.
    const failedDownstreams = downstreamOutcomes.filter(
      (o) => o.errored && !ASYNC_PROTOCOLS.has(o.edge.protocol)
    );
    const anyDownstreamFailed = failedDownstreams.length > 0;
    const cascadeError = !directError && anyDownstreamFailed && !serviceNode.resilient;

    const isError = directError || cascadeError;

    // For cascade: pick bad_gateway (502) unless the downstream itself timed out (504 → re-raise gateway_timeout).
    const cascadeErrorType: ServiceErrorType = failedDownstreams.some(
      (o) => o.childHttpStatus >= 504
    )
      ? 'gateway_timeout'
      : 'bad_gateway';

    const effectiveErrorType: ServiceErrorType = (() => {
      if (directError) {
        const t = directFailConf?.errorType ?? 'internal_error';
        return isInfraErrorType(t) ? 'internal_error' : t;
      }
      return cascadeErrorType;
    })();
    const effectiveSourceDep = directError ? directFailConf?.sourceDep : undefined;

    // For cascade errors, expose the upstream service name and its status code
    // so BAD_GATEWAY / GATEWAY_TIMEOUT templates can reference them.
    const worstFailed = failedDownstreams[0];
    const cascadeOverrides: Record<string, string> =
      cascadeError && worstFailed
        ? {
            upstream_host: worstFailed.edge.target,
            upstream_status: String(worstFailed.childHttpStatus),
          }
        : {};
    const httpStatus = isError
      ? ERROR_TYPE_STATUS[effectiveErrorType] ?? 500
      : rng() < 0.9
      ? 200
      : 201;

    const overrides = { status: String(httpStatus), ...cascadeOverrides };

    const message = isError
      ? pickErrorMessage({
          errorType: effectiveErrorType,
          seed: svcSeed,
          tickSeed: svcTickSeed,
          runtime: serviceNode.runtime,
          serviceName: serviceNode.name,
          overrides,
          sourceDep: effectiveSourceDep,
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

    const level = isError ? 'error' : 'info';

    // Infra-layer kills (k8s_oom, k8s_crash_loop_back) get SIGKILL — no app exception or traceback.
    const isInfraKill =
      directError && directFailConf != null && isInfraErrorType(directFailConf.errorType);
    const isUnhandled = isError && effectiveErrorType === 'internal_error' && !isInfraKill;
    const stackTrace = isUnhandled
      ? getStackTrace({
          runtime: serviceNode.runtime,
          seed: svcSeed,
          serviceName: serviceNode.name,
        })
      : undefined;

    const errorDocCount = isError ? (directError ? directFailConf?.multiplier ?? 1 : 1) : 0;
    for (let e = 0; e < (isError ? errorDocCount : 1); e++) {
      docs.push(
        buildLogDoc({
          service: serviceNode,
          level,
          message: isError && stackTrace ? stackTrace : message,
          metadata,
        })
      );
    }

    if (emitWarn) {
      docs.push(
        buildLogDoc({
          service: serviceNode,
          level: 'warn',
          message: pickWarnMessage({
            errorType: directFailConf!.errorType,
            seed: svcSeed,
            tickSeed: svcTickSeed,
            runtime: serviceNode.runtime,
            serviceName: serviceNode.name,
            sourceDep: directFailConf!.sourceDep,
          }),
          metadata,
        })
      );
    }

    for (const { edge, errored, childHttpStatus } of downstreamOutcomes) {
      const callLatency = errored ? 3000 + Math.floor(rng() * 5000) : 5 + Math.floor(rng() * 120);

      const isAsync = ASYNC_PROTOCOLS.has(edge.protocol);

      const outboundHttpStatus = isAsync ? 200 : childHttpStatus;

      const edgeSeed = serviceStableSeed(svcSeed, edge.target);
      const edgeTickSeed = serviceStableSeed(svcTickSeed, edge.target);

      const outboundMsgs = pickOutboundMessages({
        seed: edgeSeed,
        tickSeed: edgeTickSeed,
        runtime: serviceNode.runtime,
        serviceName: serviceNode.name,
        targetService: edge.target,
        protocol: edge.protocol,
        httpStatus: outboundHttpStatus,
        latencyMs: callLatency,
      });

      for (const { message: outboundMsg, level: outboundMsgLevel } of outboundMsgs) {
        docs.push(
          buildLogDoc({
            service: serviceNode,
            level: outboundMsgLevel,
            message: outboundMsg,
            metadata,
          })
        );
      }
    }

    return { errored: isError, httpStatus };
  }

  visit(entryService);
  return docs;
}

export function generateServiceDocs({
  serviceGraph,
  entryService,
  index,
  seed,
  failures,
  timestamp,
  metadataCache,
}: RequestDocsOptions): Array<Partial<LogDocument>> {
  const stableSeed = seed ?? 0;
  const tickSeed = resolveEffectiveSeed(seed, index ?? 0, timestamp);
  const resolvedFailures = failures ? resolveServiceFailures(serviceGraph, failures) : undefined;
  const rng = mulberry32(tickSeed);
  return simulateRequest({
    serviceGraph,
    entryService,
    rng,
    resolvedFailures,
    stableSeed,
    tickSeed,
    metadataCache,
  });
}
