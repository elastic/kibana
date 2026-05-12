/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, serviceTransactionDataSourceRt } from '../../default_api_types';

export interface ServiceNodeMetadataResponse {
  host: string | number;
  containerId: string | number;
}

export const serviceNodeMetadataRoute = defineRoute<ServiceNodeMetadataResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt, serviceTransactionDataSourceRt]),
  }),
});
