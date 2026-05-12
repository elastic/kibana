/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { ConnectionStats, Node } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt, offsetRt } from '../../default_api_types';

export interface UpstreamServicesForDependencyResponse {
  services: Array<{
    location: Node;
    currentStats: ConnectionStats & { impact: number };
    previousStats: (ConnectionStats & { impact: number }) | null;
  }>;
}

export const upstreamServicesRoute = defineRoute<UpstreamServicesForDependencyResponse>()({
  endpoint: 'GET /internal/apm/dependencies/upstream_services',
  params: t.intersection([
    t.type({
      query: t.intersection([
        t.type({ dependencyName: t.string }),
        rangeRt,
        t.type({ numBuckets: toNumberRt }),
      ]),
    }),
    t.partial({
      query: t.intersection([environmentRt, offsetRt, kueryRt]),
    }),
  ]),
});
