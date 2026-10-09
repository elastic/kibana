/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type { OpenAPISpec } from '../../input/load_oas';
import { isRecord } from '../is_record';
import type { RequestBodyConsumer } from './types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

export interface RequestBodySchemaContext {
  schema: unknown;
  consumer: RequestBodyConsumer;
}

const requestBodySchemas = (
  pathName: string,
  pathEntry: unknown,
  method: (typeof HTTP_METHODS)[number]
): RequestBodySchemaContext[] => {
  const content = get(pathEntry, [method, 'requestBody', 'content']);
  if (!isRecord(content)) return [];
  const consumer: RequestBodyConsumer = { path: pathName, method: method.toUpperCase() };
  return Object.values(content)
    .map((mediaEntry) => get(mediaEntry, 'schema'))
    .filter((schema) => schema !== undefined)
    .map((schema) => ({ schema, consumer }));
};

export const extractRequestBodyConsumers = (oas: OpenAPISpec): RequestBodySchemaContext[] => {
  if (!isRecord(oas.paths)) return [];
  return Object.entries(oas.paths).flatMap(([pathName, pathEntry]) =>
    HTTP_METHODS.flatMap((method) => requestBodySchemas(pathName, pathEntry, method))
  );
};
