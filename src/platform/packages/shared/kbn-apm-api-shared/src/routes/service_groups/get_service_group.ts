/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface ServiceGroupResponse {
  serviceGroup: SavedServiceGroup;
}

export const serviceGroupRoute = defineRoute<ServiceGroupResponse>()({
  endpoint: 'GET /internal/apm/service-group',
  params: t.type({
    query: t.type({ serviceGroup: t.string }),
  }),
});
