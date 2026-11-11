/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractRequest } from '../contract/types';
import { isRecord } from '../openapi/schema_walk';

/**
 * The parts of a request a fixture or recording applies to: path parameters, query parameters
 * and headers by value, and a body that may name only some of its fields.
 */
export interface RequestMatcher {
  readonly path?: Readonly<Record<string, string>>;
  readonly query?: Readonly<Record<string, string | readonly string[]>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

const countLeaves = (value: unknown): number => {
  const children = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  return children.length === 0
    ? 1
    : children.reduce<number>((sum, child) => sum + countLeaves(child), 0);
};

/** The number of values a matcher checks; among matching entries, the one checking most wins. */
export const countConditions = ({ path = {}, query = {}, headers = {}, body }: RequestMatcher) =>
  Object.keys(path).length +
  Object.keys(query).length +
  Object.keys(headers).length +
  (body === undefined ? 0 : countLeaves(body));

// Objects match when every field they name matches; arrays and other values match whole.
const matchesPartially = (expected: unknown, actual: unknown): boolean => {
  if (isRecord(expected)) {
    return (
      isRecord(actual) &&
      Object.entries(expected).every(([key, value]) => matchesPartially(value, actual[key]))
    );
  }
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((value, index) => matchesPartially(value, actual[index]))
    );
  }
  return expected === actual;
};

const toValues = (value: string | readonly string[] | undefined): string[] =>
  value === undefined ? [] : (Array.isArray(value) ? value : [value]).map(String);

const sameValues = (
  expected: string | readonly string[],
  actual: string | string[] | undefined
) => {
  const [wanted, got] = [toValues(expected), toValues(actual)];
  return wanted.length === got.length && wanted.every((value, index) => value === got[index]);
};

/** Whether a request has every value the matcher names. */
export const matchesRequest = (
  { path = {}, query = {}, headers = {}, body }: RequestMatcher,
  request: ContractRequest
): boolean => {
  const { pathParameters = {} } = request;
  return (
    Object.entries(path).every(([name, value]) => pathParameters[name] === String(value)) &&
    Object.entries(query).every(([name, value]) => sameValues(value, request.query[name])) &&
    Object.entries(headers).every(
      ([name, value]) => request.headers[name.toLowerCase()] === String(value)
    ) &&
    (body === undefined || matchesPartially(body, request.body))
  );
};
