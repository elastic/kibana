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
import type { Coordinate } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';

export interface ErrorGroupDetailedStat {
  groupId: string;
  timeseries: Coordinate[];
}

export interface ErrorGroupPeriodsResponse {
  currentPeriod: Record<string, ErrorGroupDetailedStat>;
  previousPeriod: Record<string, ErrorGroupDetailedStat>;
}

export const errorsDetailedStatisticsRoute = defineRoute<ErrorGroupPeriodsResponse>()({
  endpoint: 'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
      t.type({ numBuckets: toNumberRt }),
    ]),
    body: t.type({ groupIds: jsonRt.pipe(t.array(t.string)) }),
  }),
});
