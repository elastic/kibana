/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * SCENARIO: Exit span (service destination) change points
 *
 * Generates APM transactions with exit spans that include span.destination.service.resource
 * so Synthtrace emits service_destination metric documents. A spike window uses longer
 * span durations so observability.get_exit_span_change_points can detect a change.
 */

import datemath from '@elastic/datemath';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmFields, Timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '../../../../lib/apm/client/apm_synthtrace_es_client';
import { createCliScenario } from '../../../../lib/utils/create_scenario';
import { withClient } from '../../../../lib/utils/with_client';
import type { ScenarioReturnType } from '../../../../lib/utils/with_client';

export const EXIT_SPAN_CHANGE_POINTS_SERVICE_NAME = 'test-exit-span-service';
export const EXIT_SPAN_CHANGE_POINTS_DEPENDENCY_RESOURCE = 'postgresql';
export const EXIT_SPAN_CHANGE_POINTS_ANALYSIS_WINDOW = {
  start: 'now-60m',
  end: 'now',
};
export const EXIT_SPAN_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW = {
  start: 'now-30m',
  end: 'now-28m',
};

export function generateExitSpanChangePointsData({
  range,
  changeWindow = {
    start: EXIT_SPAN_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start,
    end: EXIT_SPAN_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end,
  },
  environment = 'test',
  transactionType = 'request',
  apmEsClient,
}: {
  range?: Timerange;
  changeWindow?: { start: string; end: string };
  environment?: string;
  transactionType?: string;
  apmEsClient: ApmSynthtraceEsClient;
}): ScenarioReturnType<ApmFields> {
  const effectiveRange =
    range ??
    timerange(
      EXIT_SPAN_CHANGE_POINTS_ANALYSIS_WINDOW.start,
      EXIT_SPAN_CHANGE_POINTS_ANALYSIS_WINDOW.end
    );

  const spikeStart = datemath.parse(changeWindow.start)!.valueOf();
  const spikeEnd = datemath.parse(changeWindow.end)!.valueOf();

  const instance = apm
    .service({
      name: EXIT_SPAN_CHANGE_POINTS_SERVICE_NAME,
      environment,
      agentName: 'test-agent',
    })
    .instance('instance-test');

  const transactionName = 'GET /api/orders';

  const traceStream = effectiveRange
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      const isSpike = timestamp >= spikeStart && timestamp < spikeEnd;

      const txDurationUs = isSpike ? 5_000 : 500;
      const spanDurationUs = isSpike ? 10_000 : 1_000;

      const traces = [];
      for (let i = 0; i < 25; i++) {
        traces.push(
          instance
            .transaction({ transactionName, transactionType })
            .timestamp(timestamp)
            .duration(txDurationUs)
            .children(
              instance
                .span({
                  spanName: 'db.query',
                  spanType: 'db',
                  spanSubtype: EXIT_SPAN_CHANGE_POINTS_DEPENDENCY_RESOURCE,
                })
                .timestamp(timestamp)
                .duration(spanDurationUs)
                .destination(EXIT_SPAN_CHANGE_POINTS_DEPENDENCY_RESOURCE)
                .success()
            )
            .success()
        );
      }
      return traces;
    });

  return withClient(apmEsClient, traceStream);
}

export default createCliScenario(({ range, clients: { apmEsClient } }) =>
  generateExitSpanChangePointsData({
    range,
    apmEsClient,
  })
);
