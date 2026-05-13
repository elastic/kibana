/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { processorEventRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface LinkedParentsResponse {
  spanLinksDetails: SpanLinkDetails[];
}

export const linkedParentsRoute = defineRoute<LinkedParentsResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, t.type({ processorEvent: processorEventRt })]),
  }),
});
