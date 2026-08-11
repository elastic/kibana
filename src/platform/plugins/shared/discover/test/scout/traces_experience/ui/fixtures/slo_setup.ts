/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encode } from '@kbn/rison';
import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { TRACES } from './constants';

/**
 * Rison-encoded _a param for the SLO History tab that sets the time range
 * to match the synthtrace data window, so the "View events" link picks up
 * actual data and opens Discover with the correct time range.
 */
export const SLO_HISTORY_APP_STATE = encode({
  range: {
    from: TRACES.DEFAULT_START_TIME,
    to: TRACES.DEFAULT_END_TIME,
  },
});

const APM_SERVICE_NAME = 'synth-traces-frontend';
const APM_ENVIRONMENT = 'production';
const APM_TRANSACTION_TYPE = 'request';

export interface SloIds {
  latency: string;
  availability: string;
}

export async function setupSlosForTracesExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'],
  kbnClient: ScoutParallelWorkerFixtures['kbnClient']
): Promise<SloIds> {
  const spaceId = scoutSpace.id;

  const createSlo = async (body: object): Promise<string> => {
    const { data } = await kbnClient.request({
      method: 'POST',
      path: `/s/${spaceId}/api/observability/slos`,
      body,
    });
    return (data as { id: string }).id;
  };

  const [latencyId, availabilityId] = await Promise.all([
    createSlo({
      name: 'Scout - APM latency SLO',
      description: 'Used by explore_from_slo Scout test',
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: {
          service: APM_SERVICE_NAME,
          environment: APM_ENVIRONMENT,
          transactionType: APM_TRANSACTION_TYPE,
          transactionName: '*',
          threshold: 500,
          index: TRACES.DATA_VIEW_NAME,
        },
      },
      budgetingMethod: 'occurrences',
      timeWindow: { duration: '30d', type: 'rolling' },
      objective: { target: 0.99 },
      tags: [],
      groupBy: '*',
      settings: { preventInitialBackfill: true },
    }),
    createSlo({
      name: 'Scout - APM availability SLO',
      description: 'Used by explore_from_slo Scout test',
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: {
          service: APM_SERVICE_NAME,
          environment: APM_ENVIRONMENT,
          transactionType: APM_TRANSACTION_TYPE,
          transactionName: '*',
          index: TRACES.DATA_VIEW_NAME,
        },
      },
      budgetingMethod: 'occurrences',
      timeWindow: { duration: '30d', type: 'rolling' },
      objective: { target: 0.99 },
      tags: [],
      groupBy: '*',
      settings: { preventInitialBackfill: true },
    }),
  ]);

  return { latency: latencyId, availability: availabilityId };
}

export async function teardownSlosForTracesExperience(
  kbnClient: ScoutParallelWorkerFixtures['kbnClient'],
  spaceId: string,
  sloIds: SloIds
): Promise<void> {
  await Promise.all(
    Object.values(sloIds).map((id) =>
      kbnClient.request({
        method: 'DELETE',
        path: `/s/${spaceId}/api/observability/slos/${id}`,
      })
    )
  );
}
