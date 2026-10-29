/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GraphQLAbstractType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
} from 'graphql';
import { isAbstractType, isLeafType, isListType, isNonNullType } from 'graphql';
import type { Violation } from '../contract/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The object type a stored value of an abstract type is: the one its `__typename` names, else
 * the first possible type, as the mock resolves sampled values.
 */
export const resolveStoredType = (
  schema: GraphQLSchema,
  abstractType: GraphQLAbstractType,
  value: unknown
): GraphQLObjectType | undefined => {
  const possibleTypes = schema.getPossibleTypes(abstractType);
  const typename = isRecord(value) ? value.__typename : undefined;
  return typeof typename === 'string'
    ? possibleTypes.find(({ name }) => name === typename)
    : possibleTypes[0];
};

/**
 * Checks a stored value, such as a recorded root field, against its GraphQL type. Values may
 * leave out fields, since requests select some fields only; fields the type doesn't declare,
 * nulls in non-null fields, and scalars or enum values the type can't serialize are violations.
 */
export const checkGraphQLValue = (
  schema: GraphQLSchema,
  type: GraphQLOutputType,
  value: unknown,
  path: readonly string[]
): Violation[] => {
  if (value === null || value === undefined) {
    return isNonNullType(type)
      ? [{ path: [...path], code: 'null', message: `Expected a non-null ${type.ofType}` }]
      : [];
  }
  const nullable = isNonNullType(type) ? type.ofType : type;
  if (isListType(nullable)) {
    return Array.isArray(value)
      ? value.flatMap((item, index) =>
          checkGraphQLValue(schema, nullable.ofType, item, [...path, String(index)])
        )
      : [{ path: [...path], code: 'type', message: `Expected a list of ${nullable.ofType}` }];
  }
  if (isLeafType(nullable)) {
    try {
      nullable.serialize(value);
      return [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [{ path: [...path], code: 'type', message }];
    }
  }
  if (!isRecord(value)) {
    return [{ path: [...path], code: 'type', message: `Expected an object of type ${nullable}` }];
  }
  const objectType = isAbstractType(nullable)
    ? resolveStoredType(schema, nullable, value)
    : nullable;
  if (!objectType) {
    const message = `${String(value.__typename)} is not a possible type of ${nullable}`;
    return [{ path: [...path, '__typename'], code: 'type', message }];
  }
  const fields = objectType.getFields();
  return Object.entries(value).flatMap(([key, child]) => {
    if (key === '__typename') {
      return [];
    }
    const field = fields[key];
    return field
      ? checkGraphQLValue(schema, field.type, child, [...path, key])
      : [
          {
            path: [...path, key],
            code: 'undeclared',
            message: `${objectType.name} has no field ${key}`,
          },
        ];
  });
};
