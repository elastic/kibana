/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import type { CorrelationsResponse } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';
import { entityTypeRt, metricRt } from './types';

export type UnifiedCorrelationsRouteResponse = CorrelationsResponse;

export const unifiedCorrelationsRoute = defineRoute<UnifiedCorrelationsRouteResponse>()({
  endpoint: 'POST /internal/apm/correlations',
  params: t.type({
    body: t.intersection([
      t.type({
        entityType: entityTypeRt,
        metric: metricRt,
      }),
      t.partial({
        fieldCandidates: t.array(t.string),
        durationMin: toNumberRt,
        durationMax: toNumberRt,
        percentileThreshold: toNumberRt,
        includeHistogram: toBooleanRt,
        kuery: t.string,
      }),
      rangeRt,
    ]),
  }),
});
