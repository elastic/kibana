/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates OTel APM transactions for hosts that have **no** infrastructure
 * metrics. Designed to be layered on top of an existing `infra_hosts_semconv`
 * ingest so the Hosts UI's `getApmHostNames` Phase A call has something to
 * return that is disjoint from the infra-metric host set.
 *
 * Pairs with [REPORT.md] "Still pending → APM-host coverage on the
 * measurement matrix" — we want to size:
 *   - the extra Phase A round-trip cost in `getApmHostNames`,
 *   - the union+dedup cost on the Kibana node,
 *   - Phase B behaviour when `union > limit` (e.g. 1500 infra + 750 APM-only
 *     blows past `MAX_HOST_COUNT_LIMIT = 500`).
 *
 * Scenario options:
 *   --scenarioOpts.numApmOnlyHosts=750   (default 750)
 *   --scenarioOpts.namePrefix=apm-only-host-   (default; chosen to be
 *                                              lexicographically *after*
 *                                              `semconv-host-*` so the
 *                                              alphabetic-truncation gap
 *                                              described in PROPOSALS.md
 *                                              §"Tier 3 ordering invariant"
 *                                              is exercised — the 500-cap
 *                                              will silently drop the APM
 *                                              hosts under today's lex
 *                                              ordering)
 */

import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { ApmOtelFields, OtelInstance } from '@kbn/synthtrace-client';
import { random, times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt, getStringOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmOtelFields> = async ({ logger, scenarioOpts }) => {
  const numApmOnlyHosts = getNumberOpt(scenarioOpts, 'numApmOnlyHosts', 750);
  const namePrefix = getStringOpt(scenarioOpts, 'namePrefix') ?? 'apm-only-host-';

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = 'GET /api/host/{id}';

      const otelInstances = times(numApmOnlyHosts).map((index) =>
        apm
          .otelService({
            name: `synth-otel-svc-apmonly-${index}`,
            namespace: ENVIRONMENT,
            sdkLanguage: 'java',
            sdkName: 'opentelemetry',
            distro: 'elastic',
          })
          .instance(`${namePrefix}${index}`)
      );

      const instanceSpans = (instance: OtelInstance) => {
        const throughput = random(1, 10);
        const hasHighDuration = Math.random() > 0.5;

        return range.ratePerMinute(throughput).generator((timestamp) => {
          const duration = hasHighDuration ? random(1000, 5000) : random(100, 1000);
          return instance
            .span({ name: transactionName, kind: 'Server' })
            .timestamp(timestamp)
            .duration(duration)
            .success();
        });
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_only_hosts', () =>
          otelInstances.flatMap((instance) => instanceSpans(instance))
        )
      );
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
