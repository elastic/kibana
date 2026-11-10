/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '../engine/response_engine';
import { isRecord } from '../openapi/schema_walk';

// The most fixtures set at once.
const MAX_FIXTURES = 1000;

const isStringRecord = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');

// The most responses in one fixture's sequence.
const MAX_RESPONSES = 100;

const responseShapeError = (response: unknown, at: string): string | undefined => {
  if (!isRecord(response) || !Number.isInteger(response.status)) {
    return `${at} must be { status, headers?, body? }`;
  }
  if (response.headers !== undefined && !isStringRecord(response.headers)) {
    return `${at}.headers must map names to strings`;
  }
  return undefined;
};

// The shape of a fixture; whether the spec allows its responses is checked when it is set.
const fixtureShapeError = (fixture: unknown, index: number): string | undefined => {
  const at = `fixtures[${index}]`;
  if (!isRecord(fixture)) {
    return `${at} must be an object`;
  }
  const { operation, when, response, responses } = fixture;
  const namesOperation =
    isRecord(operation) &&
    (typeof operation.name === 'string' ||
      (typeof operation.method === 'string' && typeof operation.path === 'string'));
  if (!namesOperation) {
    return `${at}.operation must be { method, path, source? } or { name, source? }`;
  }
  if (when !== undefined && !isRecord(when)) {
    return `${at}.when must be an object`;
  }
  if ((response === undefined) === (responses === undefined)) {
    return `${at} must have either response or responses`;
  }
  if (responses === undefined) {
    return responseShapeError(response, `${at}.response`);
  }
  if (!Array.isArray(responses) || responses.length === 0 || responses.length > MAX_RESPONSES) {
    return `${at}.responses must be a list of 1 to ${MAX_RESPONSES} responses`;
  }
  return responses
    .map((entry, position) => responseShapeError(entry, `${at}.responses[${position}]`))
    .find((error) => error !== undefined);
};

/** Checks that a value is `{ fixtures: ResponseFixture[] }` in shape, at most `MAX_FIXTURES`. */
export const checkFixtures = (
  value: unknown
): { fixtures: ResponseFixture[] } | { error: string } => {
  const fixtures = isRecord(value) ? value.fixtures : undefined;
  if (!Array.isArray(fixtures)) {
    return { error: 'The body must be { "fixtures": [...] }' };
  }
  if (fixtures.length > MAX_FIXTURES) {
    return { error: `At most ${MAX_FIXTURES} fixtures can be set at once` };
  }
  const shapeError = fixtures
    .map((fixture, index) => fixtureShapeError(fixture, index))
    .find((error) => error !== undefined);
  return shapeError ? { error: shapeError } : { fixtures: fixtures as ResponseFixture[] };
};
