/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface MetadataForDependencyResponse {
  spanType: string | undefined;
  spanSubtype: string | undefined;
}

export interface DependencyMetadataRouteResponse {
  metadata: MetadataForDependencyResponse;
}

export const dependencyMetadataRoute = defineRoute<DependencyMetadataRouteResponse>()({
  endpoint: 'GET /internal/apm/dependencies/metadata',
  params: t.type({
    query: t.intersection([t.type({ dependencyName: t.string }), rangeRt]),
  }),
});
