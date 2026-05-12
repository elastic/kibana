/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { ErrorsByTraceId } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export const unifiedTracesByIdErrorsRoute = defineRoute<ErrorsByTraceId>()({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}/errors',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([rangeRt, t.partial({ docId: t.string })]),
  }),
});
