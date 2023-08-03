/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type EndpointsAvailability = 'stack' | 'serverless';

export interface EndpointDescription {
  methods?: string[];
  patterns?: string | string[];
  url_params?: Record<string, unknown>;
  data_autocomplete_rules?: Record<string, unknown>;
  url_components?: Record<string, unknown>;
  priority?: number;
  availability?: Record<EndpointsAvailability, boolean>;
}

export interface EndpointDefinition {
  [endpointName: string]: EndpointDescription;
}
