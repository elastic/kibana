/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type EndpointsAvailability = 'stack' | 'serverless';

export interface EndpointDescription {
  /**
   * HTTP request methods this endpoint accepts: GET, POST, DELETE etc
   */
  methods?: string[];

  /**
   * URLs paths this endpoint accepts, can contain parameters in curly braces.
   * For example, /_cat/indices/{index}
   */
  patterns?: string | string[];

  /**
   * List of possible values for parameters used in patterns.
   */
  url_components?: DefinitionUrlParams;

  /**
   * Query parameters for this endpoint.
   */
  url_params?: DefinitionUrlParams;

  /**
   * Request body parameters for this endpoint.
   */
  data_autocomplete_rules?: Record<string, unknown>;

  /**
   * A priority number when the same endpoint name is used.
   */
  priority?: number;

  /**
   * An url of the documentation page of this endpoint.
   * Can contain a parameter {branch}.
   */
  documentation?: string;

  /**
   * If the endpoint is available different environments (stack, serverless).
   */
  availability?: Record<EndpointsAvailability, boolean>;
}

export type DefinitionUrlParams = Record<string, unknown>;

export interface EndpointDefinition {
  [endpointName: string]: EndpointDescription;
}
