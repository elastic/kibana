/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { KnownParameters, OpenAPIConverter } from '../type';

import { zodConverter } from './zod';
import { kbnConfigSchemaConverter } from './kbn_config_schema/kbn_config_schema';
import { catchAllConverter } from './catch_all';

const CONVERTERS: OpenAPIConverter[] = [kbnConfigSchemaConverter, zodConverter, catchAllConverter];
const getConverter = (schema: unknown): OpenAPIConverter => {
  return CONVERTERS.find((c) => c.is(schema))!;
};

export const convert = (schema: unknown): OpenAPIV3.SchemaObject => {
  return getConverter(schema).convert(schema);
};

export const convertPathParameters = (
  schema: unknown,
  pathParameters: KnownParameters
): OpenAPIV3.ParameterObject[] => {
  return getConverter(schema).convertPathParameters(schema, pathParameters);
};

export const convertQuery = (schema: unknown): OpenAPIV3.ParameterObject[] => {
  return getConverter(schema).convertQuery(schema);
};
