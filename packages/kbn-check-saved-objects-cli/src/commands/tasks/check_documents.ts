/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { diff } from 'jest-diff';
import equal from 'fast-deep-equal';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { Task, FixtureMap } from '../types';

/**
 * The set of primitive types that a fixture matcher can assert against.
 */
type FixtureMatcherType = 'string' | 'number' | 'boolean' | 'uuid';

/**
 * A special marker object that can appear inside a fixture document in place of
 * a literal value. Instead of requiring an exact match, the comparison logic
 * asserts that the corresponding field in the actual document satisfies the
 * given type constraint.
 *
 * Supported in fixture JSON as:
 *   { "$match": "uuid" }    — any UUID string
 *   { "$match": "string" }  — any string
 *   { "$match": "number" }  — any number
 *   { "$match": "boolean" } — any boolean
 */
interface FixtureMatcher {
  $match: FixtureMatcherType;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isFixtureMatcher = (value: unknown): value is FixtureMatcher =>
  typeof value === 'object' &&
  value !== null &&
  '$match' in value &&
  typeof (value as Record<string, unknown>).$match === 'string';

const matchesMatcher = (matcher: FixtureMatcher, actual: unknown): boolean => {
  switch (matcher.$match) {
    case 'string':
      return typeof actual === 'string';
    case 'number':
      return typeof actual === 'number';
    case 'boolean':
      return typeof actual === 'boolean';
    case 'uuid':
      return typeof actual === 'string' && UUID_REGEX.test(actual);
  }
};

/**
 * Recursively compares a fixture value against an actual value, honouring any
 * {@link FixtureMatcher} objects encountered in the fixture.
 */
const matchesFixture = (fixture: unknown, actual: unknown): boolean => {
  if (isFixtureMatcher(fixture)) {
    return matchesMatcher(fixture, actual);
  }
  if (Array.isArray(fixture) && Array.isArray(actual)) {
    return (
      fixture.length === actual.length &&
      fixture.every((item, i) => matchesFixture(item, actual[i]))
    );
  }
  if (
    typeof fixture === 'object' &&
    fixture !== null &&
    typeof actual === 'object' &&
    actual !== null
  ) {
    const fixtureEntries = Object.entries(fixture as Record<string, unknown>);
    const actualKeys = Object.keys(actual as Record<string, unknown>);
    return (
      fixtureEntries.length === actualKeys.length &&
      fixtureEntries.every(([key, val]) =>
        matchesFixture(val, (actual as Record<string, unknown>)[key])
      )
    );
  }
  return equal(fixture, actual);
};

/**
 * Replaces {@link FixtureMatcher} objects in `fixture` with either:
 * - the corresponding `actual` value (when the matcher passes) — so the field
 *   disappears from the diff, or
 * - a human-readable placeholder like `"<any uuid>"` (when it fails) — so the
 *   diff still highlights the real problem.
 */
const resolveFixtureForDiff = (fixture: unknown, actual: unknown): unknown => {
  if (isFixtureMatcher(fixture)) {
    return matchesMatcher(fixture, actual) ? actual : `<any ${fixture.$match}>`;
  }
  if (Array.isArray(fixture) && Array.isArray(actual)) {
    return fixture.map((item, i) => resolveFixtureForDiff(item, actual[i]));
  }
  if (
    typeof fixture === 'object' &&
    fixture !== null &&
    typeof actual === 'object' &&
    actual !== null
  ) {
    return Object.fromEntries(
      Object.entries(fixture as Record<string, unknown>).map(([key, val]) => [
        key,
        resolveFixtureForDiff(val, (actual as Record<string, unknown>)[key]),
      ])
    );
  }
  return fixture;
};

export function checkDocuments({
  repository,
  types,
  fixtures,
}: {
  repository: ISavedObjectsRepository;
  types: SavedObjectsType[];
  fixtures: FixtureMap;
}): Task {
  return async () => {
    const typeNames = types.map(({ name }) => name);
    const results = await repository.search({ type: typeNames, namespaces: ['*'] });

    results.hits.hits.forEach((hit) => {
      const type = hit._source!.type;
      const attributes = hit._source![type];
      const { relativePath, version, documents } = fixtures[type];
      const matchingFixture = documents.find((fixture) => matchesFixture(fixture, attributes));
      if (!matchingFixture) {
        const diffs = documents.map((fixture, index) => {
          const resolved = resolveFixtureForDiff(fixture, attributes);
          const diffResult = diff(resolved, attributes, { includeChangeCounts: true }) ?? '';
          const removedCount = parseInt(diffResult.match(/Expected\s+-\s+(\d+)/)?.[1] ?? '0', 10);
          const addedCount = parseInt(diffResult.match(/Received\s+\+\s+(\d+)/)?.[1] ?? '0', 10);
          return { index, diffResult, totalChanges: removedCount + addedCount };
        });
        const closestDiff = diffs.reduce((best, current) =>
          current.totalChanges < best.totalChanges ? current : best
        );
        const messages = [
          `❌ A document of type '${type}' did NOT match any of the fixtures`,
          `Closest match: fixtures['${version}'][${closestDiff.index}] (${relativePath})\n`,
          closestDiff.diffResult,
        ];
        throw new Error(messages.join('\n'));
      }
    });
  };
}
