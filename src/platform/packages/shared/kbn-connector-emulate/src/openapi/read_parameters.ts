/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coerceValue, getPropertySchema, getSchemaTypes } from './coerce_value';
import type { ContractOperation, OpenApiDocument, OperationParameter } from './types';

/** The query parameter that selects the page in opaque next-page URLs the mock issues. */
export const MOCK_PAGE_PARAM = 'contract-mock-page';

export interface ParameterInput {
  readonly query: Readonly<Record<string, string | string[]>>;
  /** Header names are lowercase. */
  readonly headers: Readonly<Record<string, string>>;
  readonly pathParameters: Readonly<Record<string, string>>;
}

export interface ReadParameter {
  readonly parameter: OperationParameter;
  /** The deserialized and coerced value, or undefined when the request doesn't send it. */
  readonly value: unknown;
}

const QUERY_DELIMITERS: Readonly<Record<string, string>> = {
  spaceDelimited: ' ',
  pipeDelimited: '|',
  tabDelimited: '\t',
};

const toPairsObject = (parts: readonly string[]): Record<string, string> => {
  const object: Record<string, string> = {};
  for (let index = 0; index + 1 < parts.length; index += 2) {
    object[parts[index]] = parts[index + 1];
  }
  return object;
};

const toKeyValueObject = (parts: readonly string[]): Record<string, string> =>
  Object.fromEntries(
    parts.map((part) => {
      const separator = part.indexOf('=');
      return separator < 0 ? [part, ''] : [part.slice(0, separator), part.slice(separator + 1)];
    })
  );

// `a,b` is an array for array schemas, and `k,v` (or `k=v` when exploded) an object.
const splitValue = (
  value: string,
  delimiter: string | RegExp,
  types: Set<string>,
  explode: boolean
) => {
  if (types.has('array')) {
    return value === '' ? [] : value.split(delimiter);
  }
  if (types.has('object')) {
    const parts = value.split(delimiter);
    return explode ? toKeyValueObject(parts) : toPairsObject(parts);
  }
  return value;
};

/** Query keys that aren't operation parameters: the mock's page and API keys sent in the query. */
export const nonParameterQueryKeys = ({ security }: ContractOperation): Set<string> =>
  new Set([
    MOCK_PAGE_PARAM,
    ...security
      .flat()
      .flatMap(({ credential }) => (credential?.in === 'query' ? [credential.name] : [])),
  ]);

/** Whether a query parameter is an object sent as one query key per property (form, exploded). */
export const spreadsQueryKeys = (
  { in: location, style, explode }: OperationParameter,
  types: Set<string>
): boolean =>
  location === 'query' && style === 'form' && explode && types.has('object') && !types.has('array');

const readQuery = (
  parameter: OperationParameter,
  query: ParameterInput['query'],
  types: Set<string>,
  isClaimed: (key: string) => boolean,
  document: OpenApiDocument
): unknown => {
  const { name, style, explode } = parameter;
  if (spreadsQueryKeys(parameter, types)) {
    // The parameter's name isn't sent; every query key no other parameter claims is a property.
    // A lone value is a one-item array for a property that takes arrays (a map of string lists).
    const entries = Object.entries(query)
      .filter(([key]) => key === name || !isClaimed(key))
      .map(([key, value]) => [
        key,
        typeof value === 'string' &&
        getSchemaTypes(getPropertySchema(parameter.schema?.schema, key, document), document).has(
          'array'
        )
          ? [value]
          : value,
      ]);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  if (style === 'deepObject') {
    const prefix = `${name}[`;
    const entries = Object.entries(query)
      .filter(([key]) => key.startsWith(prefix) && key.endsWith(']'))
      .map(([key, value]) => [key.slice(prefix.length, -1), value]);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  const raw = query[name];
  if (raw === undefined || Array.isArray(raw)) {
    return raw;
  }
  if (explode) {
    return types.has('array') ? [raw] : raw;
  }
  return splitValue(raw, QUERY_DELIMITERS[style] ?? ',', types, false);
};

const readPath = ({ style, explode }: OperationParameter, value: string, types: Set<string>) => {
  if (style === 'label') {
    return splitValue(value.replace(/^\./, ''), explode ? '.' : ',', types, explode);
  }
  if (style !== 'matrix') {
    return splitValue(value, ',', types, explode);
  }
  const parts = value.replace(/^;/, '').split(';');
  const values = parts.map((part) => part.slice(part.indexOf('=') + 1));
  if (explode) {
    return types.has('object') ? toKeyValueObject(parts) : types.has('array') ? values : values[0];
  }
  return splitValue(values[0] ?? '', ',', types, false);
};

const parseCookies = (header = ''): Record<string, string> =>
  toKeyValueObject(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
  );

const readRaw = (
  parameter: OperationParameter,
  input: ParameterInput,
  types: Set<string>,
  isClaimed: (key: string) => boolean,
  document: OpenApiDocument
) => {
  const { name, in: location, explode } = parameter;
  if (location === 'query') {
    return readQuery(parameter, input.query, types, isClaimed, document);
  }
  if (location === 'path') {
    const value = input.pathParameters[name];
    return value === undefined ? undefined : readPath(parameter, value, types);
  }
  const value =
    location === 'header'
      ? input.headers[name.toLowerCase()]
      : parseCookies(input.headers.cookie)[name];
  if (value === undefined) {
    return undefined;
  }
  return location === 'header'
    ? splitValue(value.trim(), /\s*,\s*/, types, explode)
    : splitValue(value, ',', types, false);
};

/**
 * Reads every declared parameter of an operation from a request, deserializing it according
 * to its `style` and `explode` and converting it to the types of its schema.
 */
export const readParameters = (
  operation: ContractOperation,
  input: ParameterInput
): ReadParameter[] => {
  const {
    parameters,
    spec: { document },
  } = operation;
  // Query keys with a meaning of their own, which form-exploded objects don't take: other
  // parameters' names, and the `name[key]` keys of `deepObject` parameters.
  const claimedNames = new Set([
    ...nonParameterQueryKeys(operation),
    ...parameters.flatMap(({ in: location, name }) => (location === 'query' ? [name] : [])),
  ]);
  const deepObjectPrefixes = parameters.flatMap(({ in: location, style, name }) =>
    location === 'query' && style === 'deepObject' ? [`${name}[`] : []
  );
  const isClaimed = (key: string): boolean =>
    claimedNames.has(key) ||
    (key.endsWith(']') && deepObjectPrefixes.some((prefix) => key.startsWith(prefix)));
  return parameters.map((parameter) => {
    const schema = parameter.schema?.schema;
    const types = getSchemaTypes(schema, document);
    const raw = readRaw(parameter, input, types, isClaimed, document);
    return { parameter, value: raw === undefined ? undefined : coerceValue(raw, schema, document) };
  });
};
