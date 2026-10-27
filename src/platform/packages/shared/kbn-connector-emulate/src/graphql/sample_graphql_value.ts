/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphQLOutputType, GraphQLScalarType } from 'graphql';
import { isEnumType, isListType, isNonNullType, isScalarType } from 'graphql';
import { sampleJsonSchema } from '../engine/sample_schema';
import type { JsonSchema } from '../openapi/types';

const BUILT_IN_SCALARS: Readonly<Record<string, JsonSchema>> = {
  String: { type: 'string' },
  ID: { type: 'string' },
  Int: { type: 'integer' },
  Float: { type: 'number' },
};

// Custom scalars declare no format, so their names stand in for one.
const CUSTOM_SCALARS: ReadonlyArray<readonly [RegExp, JsonSchema]> = [
  [/date.?time|timestamp|iso8601/i, { type: 'string', format: 'date-time' }],
  [/date/i, { type: 'string', format: 'date' }],
  [/uri|url/i, { type: 'string', format: 'uri' }],
  [/json|object|map/i, { type: 'object' }],
  [/int|long/i, { type: 'integer' }],
  [/float|decimal|number/i, { type: 'number' }],
];

const sampleScalar = ({ name }: GraphQLScalarType): unknown => {
  // False, so that flags such as a connection's `hasNextPage` end paging after one page.
  if (name === 'Boolean') {
    return false;
  }
  const schema =
    BUILT_IN_SCALARS[name] ??
    CUSTOM_SCALARS.find(([pattern]) => pattern.test(name))?.[1] ??
    BUILT_IN_SCALARS.String;
  return sampleJsonSchema(schema);
};

/**
 * A deterministic value for a field of this type. Objects are empty, because execution
 * samples each of their selected fields in turn; lists hold one item.
 */
export const sampleGraphQLValue = (type: GraphQLOutputType): unknown => {
  const nullable = isNonNullType(type) ? type.ofType : type;
  if (isListType(nullable)) {
    return [sampleGraphQLValue(nullable.ofType)];
  }
  if (isEnumType(nullable)) {
    return nullable.getValues()[0]?.value;
  }
  if (isScalarType(nullable)) {
    return sampleScalar(nullable);
  }
  return {};
};
