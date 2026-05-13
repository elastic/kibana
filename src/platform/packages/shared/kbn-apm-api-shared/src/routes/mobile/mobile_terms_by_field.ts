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
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export type MobileTermsByFieldResponse = Array<{
  label: string;
  count: number;
}>;

export interface MobileTermsByFieldRouteResponse {
  terms: MobileTermsByFieldResponse;
}

export const mobileTermsByFieldRoute = defineRoute<MobileTermsByFieldRouteResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/terms',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      environmentRt,
      t.type({
        size: toNumberRt,
        fieldName: t.string,
      }),
    ]),
  }),
});
