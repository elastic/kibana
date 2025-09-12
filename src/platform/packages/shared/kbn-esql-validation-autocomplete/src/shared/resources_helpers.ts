/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-ast';
import { BasicPrettyPrinter, Builder, EDITOR_MARKER } from '@kbn/esql-ast';
import type {
  ESQLColumnData,
  ESQLFieldWithMetadata,
  ESQLPolicy,
} from '@kbn/esql-ast/src/commands_registry/types';
import { expandEvals } from './expand_evals';
import { getCurrentQueryAvailableColumns, getFieldsFromES } from './helpers';
import type { ESQLCallbacks } from './types';

export const NOT_SUGGESTED_TYPES = ['unsupported'];

const cache = new Map<string, ESQLColumnData[]>();

/**
 * Given a query, this function will compute the available fields and cache them
 * for the next time the same query is used.
 * @param queryText
 */
async function cacheColumnsForQuery(
  query: ESQLAstQueryExpression,
  fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  getPolicies: () => Promise<Map<string, ESQLPolicy>>,
  originalQueryText: string
) {
  const cacheKey = originalQueryText.slice(query.location.min, query.location.max + 1);

  const existsInCache = cache.has(cacheKey);
  if (existsInCache) {
    // this is already in the cache
    return;
  }

  const queryBeforeCurrentCommand = BasicPrettyPrinter.print({
    ...query,
    commands: query.commands.slice(0, -1),
  });
  const fieldsAvailableAfterPreviousCommand = cache.get(queryBeforeCurrentCommand) ?? [];

  const availableFields = await getCurrentQueryAvailableColumns(
    query.commands,
    fieldsAvailableAfterPreviousCommand,
    fetchFields,
    getPolicies,
    originalQueryText
  );

  cache.set(cacheKey, availableFields);
}

/**
 * Efficiently computes the list of columns available after the given query
 * and returns column querying utilities.
 *
 * @param root
 * @param originalQueryText the text of the original query, used to infer column names from expressions
 * @param resourceRetriever
 * @returns
 */
export function getColumnsByTypeHelper(
  query: ESQLAstQueryExpression,
  originalQueryText: string,
  resourceRetriever?: ESQLCallbacks
) {
  const root = getQueryForFields(originalQueryText, query);

  // IMPORTANT: cache key can't be case-insensitive because column names are case-sensitive
  const cacheKey = originalQueryText.slice(root.location.min, root.location.max + 1);

  const cacheColumns = async () => {
    if (!cacheKey) {
      return;
    }

    const getFields = async (queryToES: string) => {
      const cached = cache.get(queryToES);
      if (cached) {
        return cached as ESQLFieldWithMetadata[];
      }
      const fields = await getFieldsFromES(queryToES, resourceRetriever);
      cache.set(queryToES, fields);
      return fields;
    };

    const subqueries = [];
    for (let i = 0; i < root.commands.length; i++) {
      subqueries.push(
        Builder.expression.query(root.commands.slice(0, i + 1), {
          location: { min: 0, max: root.commands[i].location.max },
        })
      );
    }

    const getPolicies = async () => {
      const policies = (await resourceRetriever?.getPolicies?.()) ?? [];
      return new Map(policies.map((p) => [p.name, p]));
    };

    // build fields cache for every partial query
    for (const subquery of subqueries) {
      await cacheColumnsForQuery(subquery, getFields, getPolicies, originalQueryText);
    }
  };

  return {
    getColumnsByType: async (
      expectedType: Readonly<string> | Readonly<string[]> = 'any',
      ignored: string[] = []
    ): Promise<ESQLColumnData[]> => {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      await cacheColumns();
      const cachedFields = cache.get(cacheKey);
      return (
        cachedFields?.filter(({ name, type }) => {
          const ts = Array.isArray(type) ? type : [type];
          return (
            !ignored.includes(name) &&
            (types[0] === 'any' || // if the type is 'any' we don't need to check the type
              ts.some((t) => types.includes(t))) &&
            !NOT_SUGGESTED_TYPES.includes(type)
          );
        }) || []
      );
    },
    getColumnMap: async (): Promise<Map<string, ESQLColumnData>> => {
      await cacheColumns();
      const cachedFields = cache.get(cacheKey);
      const cacheCopy = new Map<string, ESQLColumnData>();
      cachedFields?.forEach((field) => cacheCopy.set(field.name, field));
      return cacheCopy;
    },
  };
}

export function getPolicyHelper(resourceRetriever?: ESQLCallbacks) {
  const getPolicies = async () => {
    return (await resourceRetriever?.getPolicies?.()) || [];
  };
  return {
    getPolicies: async () => {
      const policies = await getPolicies();
      return policies;
    },
    getPolicyMetadata: async (policyName: string) => {
      const policies = await getPolicies();
      return policies.find(({ name }) => name === policyName);
    },
  };
}

export function getSourcesHelper(resourceRetriever?: ESQLCallbacks) {
  return async () => {
    return (await resourceRetriever?.getSources?.()) || [];
  };
}

/**
 * This function is used to build the query that will be used to compute the
 * fields available at the final position. It is robust to final partial commands
 * e.g. "FROM logs* | EVAL foo = 1 | EVAL "
 *
 * Generally, this is the user's query up to the end of the previous command, but there
 * are special cases for multi-expression EVAL and FORK branches.
 *
 * IMPORTANT: the AST nodes in the new query still reference locations in the original query text
 *
 * @param queryString The original query string
 * @param commands
 * @returns
 */
export function getQueryForFields(
  queryString: string,
  root: ESQLAstQueryExpression
): ESQLAstQueryExpression {
  const commands = root.commands;
  const lastCommand = commands[commands.length - 1];
  if (lastCommand && lastCommand.name === 'fork' && lastCommand.args.length > 0) {
    /**
     * This flattens the current fork branch into a simpler but equivalent
     * query that is compatible with the existing field computation/caching strategy.
     *
     * The intuition here is that if the cursor is within a fork branch, the
     * previous context is equivalent to a query without the FORK command:
     *
     * Original query: FROM lolz | EVAL foo = 1 | FORK (EVAL bar = 2) (EVAL baz = 3 | WHERE /)
     * Simplified:     FROM lolz | EVAL foo = 1 | EVAL baz = 3
     */
    const currentBranch = lastCommand.args[lastCommand.args.length - 1] as ESQLAstQueryExpression;
    const newCommands = commands.slice(0, -1).concat(currentBranch.commands.slice(0, -1));
    const newLocation = { min: 0, max: newCommands[newCommands.length - 1]?.location.max ?? 0 };
    return { ...root, commands: newCommands, location: newLocation };
  }

  if (lastCommand && lastCommand.name === 'eval') {
    const endsWithComma = queryString.replace(EDITOR_MARKER, '').trim().endsWith(',');
    if (lastCommand.args.length > 1 || endsWithComma) {
      /**
       * If we get here, we know that we have a multi-expression EVAL statement.
       *
       * e.g. EVAL foo = 1, bar = foo + 1, baz = bar + 1
       *
       * In order for this to work with the caching system which expects field availability to be
       * delineated by pipes, we need to split the current EVAL command into an equivalent
       * set of single-expression EVAL commands.
       *
       * Original query: FROM lolz | EVAL foo = 1, bar = foo + 1, baz = bar + 1, /
       * Simplified:     FROM lolz | EVAL foo = 1 | EVAL bar = foo + 1 | EVAL baz = bar + 1
       */
      const expanded = expandEvals(commands);
      const newCommands = expanded.slice(0, endsWithComma ? undefined : -1);
      const newLocation = { min: 0, max: newCommands[newCommands.length - 1]?.location.max ?? 0 };
      return { ...root, commands: newCommands, location: newLocation };
    }
  }

  return buildQueryUntilPreviousCommand(root);
}

function buildQueryUntilPreviousCommand(root: ESQLAstQueryExpression) {
  if (root.commands.length === 1) {
    return { ...root, commands: [root.commands[0]] };
  } else {
    const newCommands = root.commands.slice(0, -1);
    const newLocation = { min: 0, max: newCommands[newCommands.length - 1]?.location.max ?? 0 };

    return {
      ...root,
      commands: newCommands,
      location: newLocation,
    };
  }
}
