/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface StatusCounts {
  violated: number;
  degrading: number;
  healthy: number;
  noData: number;
}

export interface ServiceSlosResponse {
  results: SLOWithSummaryResponse[];
  total: number;
  page: number;
  perPage: number;
  activeAlerts: Record<string, number>;
  statusCounts: StatusCounts;
}

export const serviceSlosRoute = defineRoute<ServiceSlosResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/slos',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      t.type({
        page: toNumberRt,
        perPage: toNumberRt,
      }),
      t.partial({
        statusFilters: jsonRt.pipe(t.array(t.string)),
        kqlQuery: t.string,
      }),
    ]),
  }),
});
