/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAnySourceCommandFromESQLQuery,
  getIndexPatternFromESQLQuery,
} from './get_index_pattern_from_query';
import { getProjectRoutingFromEsqlQuery } from './set_instructions_helpers';

const PINNABLE_SOURCE_COMMANDS = new Set(['FROM', 'TS', 'PROMQL']);

/** Strip the quoting ES|QL allows around source names (`"metrics-*:metrics-*"`). */
const normalizeSource = (source: string): string => source.trim().replace(/^["'`]+|["'`]+$/g, '');

const parseSources = (value: string): string[] =>
  value.split(',').map(normalizeSource).filter(Boolean);

const quoteList = (sources: string[]): string => sources.map((source) => `"${source}"`).join(', ');

export interface ValidateQueryTargetParams {
  /** The generated query. */
  query: string;
  /** The sources the query must read, exactly as they follow the source command. */
  target: string;
  /** When set, the query must use this source command (`FROM`, `TS` or `PROMQL`). */
  sourceCommand?: string;
  /** When set, the query must keep `SET project_routing` with this value. */
  projectRouting?: string;
}

const findSourceError = (query: string, target: string): string | undefined => {
  const expected = parseSources(target);
  const actual = parseSources(getIndexPatternFromESQLQuery(query));

  // Nothing to compare: a sourceless query (`ROW`, `SHOW`) or one the parser could not
  // extract sources from. Left to the regular validation step.
  if (expected.length === 0 || actual.length === 0) {
    return undefined;
  }

  const expectedSources = new Set(expected);
  const actualSources = new Set(actual);
  const unexpected = actual.filter((source) => !expectedSources.has(source));
  // Dropping an exclusion silently widens the data the query reads.
  const droppedExclusions = expected.filter(
    (source) => source.startsWith('-') && !actualSources.has(source)
  );

  if (unexpected.length > 0) {
    return `The query reads from ${quoteList(
      unexpected
    )}, which is not the requested index. The source command must read from exactly "${target}" — use that name verbatim, including any wildcards and any "cluster:" remote prefix. Narrow the results with a WHERE clause instead of changing the source.`;
  }
  if (droppedExclusions.length > 0) {
    return `The query drops the exclusion ${quoteList(
      droppedExclusions
    )}. The source command must read from exactly "${target}" — keep every source and exclusion verbatim.`;
  }
  return undefined;
};

const findSourceCommandError = (query: string, sourceCommand: string): string | undefined => {
  const expected = sourceCommand.toUpperCase();
  const actual = getAnySourceCommandFromESQLQuery(query);
  if (!actual || !PINNABLE_SOURCE_COMMANDS.has(actual) || actual === expected) {
    return undefined;
  }
  return `The query starts with ${actual}, but it must keep the ${expected} source command of the original query.`;
};

const findProjectRoutingError = (query: string, projectRouting: string): string | undefined => {
  const actual = getProjectRoutingFromEsqlQuery(query);
  if (actual === projectRouting) {
    return undefined;
  }
  return `The query must keep \`SET project_routing = "${projectRouting}";\` before the source command${
    actual ? `, not "${actual}"` : ''
  }.`;
};

/**
 * Checks that a generated query reads only from the target it was grounded against, and
 * optionally that it keeps the same source command and `SET project_routing`.
 *
 * Neither guardrail in a generation loop catches a hallucinated source: the ES|QL validator
 * skips its unknown-source check for names containing a wildcard, and Elasticsearch answers a
 * wildcard matching nothing with an empty result rather than an error. A query against an
 * invented `something*` pattern therefore passes validation and execution unnoticed.
 *
 * Returns a message to feed back to the model, or undefined when the query is grounded.
 */
export const validateQueryTarget = ({
  query,
  target,
  sourceCommand,
  projectRouting,
}: ValidateQueryTargetParams): string | undefined => {
  const errors = [
    findSourceError(query, target),
    sourceCommand ? findSourceCommandError(query, sourceCommand) : undefined,
    projectRouting ? findProjectRoutingError(query, projectRouting) : undefined,
  ].filter((error): error is string => Boolean(error));

  return errors.length > 0 ? errors.join('\n') : undefined;
};
