/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/** Valid HTTP methods for Kibana API requests. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

/**
 * Parameters for a single Kibana API request.
 */
export interface KibanaRequestParams {
  method: HttpMethod;
  path: string;
  querystring?: Record<string, unknown>;
  body?: unknown;
  /** When set, the request is sent as multipart/form-data. Keys map to form field names; string values that resolve to an existing file path are sent as file uploads. */
  multipartFields?: Record<string, string>;
}

/**
 * Describes a path parameter that gets interpolated into the URL template.
 */
export interface KbPathParam {
  name: string;
  description: string;
  required: boolean;
}

/**
 * Describes a query string parameter for a Kibana API request.
 *
 * The `name` field (snake_case) is used in the query string;
 * the `cliFlag` (kebab-case) is what users type on the command line.
 */
export interface KbQueryParam {
  name: string;
  cliFlag?: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

/**
 * Describes a request body parameter for a Kibana API request.
 */
export interface KbBodyParam {
  name: string;
  cliFlag?: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
}

/**
 * Declarative description of a single Kibana API endpoint.
 *
 * Follows the same shape as `CloudApiDefinition` — path params, query params,
 * and body params are plain objects rather than Zod schemas. Zod is built at
 * registration time by `register.ts`.
 *
 * @example
 * ```ts
 * const getDef: KbApiDefinition = {
 *   name: 'get',
 *   namespace: 'data-views',
 *   description: 'Get a data view by ID.',
 *   method: 'GET',
 *   path: '/api/data_views/data_view/{viewId}',
 *   pathParams: [
 *     { name: 'viewId', description: 'Data view ID', required: true },
 *   ],
 * }
 * ```
 */
export interface KbApiDefinition {
  name: string;
  namespace: string;
  description: string;
  method: HttpMethod;
  path: string;
  pathParams?: KbPathParam[];
  queryParams?: KbQueryParam[];
  bodyParams?: KbBodyParam[];
  /** When 'multipart', the request body must be sent as multipart/form-data. */
  requestType?: 'multipart';
  /** When 'ndjson', the success response is newline-delimited JSON (parsed into an array). */
  responseType?: 'ndjson';
}
