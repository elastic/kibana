/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The latency map keeps its selection in the Discover ES|QL query, as a WHERE clause it
 * writes (`selectionToEsqlCondition`) and recognises (`parseSelectionCondition`, both from
 * `@kbn/trace-latency-map`). The query is edited by its text, at places the ES|QL parser
 * points to: the parser prints an expression only to compare it, never to rewrite the
 * user's query, so everything the user typed stays byte for byte.
 */

import { mutate } from '@elastic/esql';
import { appendToESQLQuery } from '@kbn/esql-utils';
import {
  isFailedOnlyCondition,
  isOperationCondition,
  isSelectionCondition,
} from '@kbn/trace-latency-map';
import { extractFilters } from '../../../utils';
import {
  commandLeadStart,
  parseEsqlQuery,
  topLevelCommands,
  whereExpression,
} from '../../../utils/esql_commands';

/**
 * Remove one `| WHERE <clause>`, wherever it sits in the query: the first top-level WHERE
 * whose expression is the clause, cut by its exact span. A user's clause that merely starts
 * with the same text, or a WHERE inside a FORK branch, is left alone, as is a query that
 * does not parse.
 */
export const removeWhere = (query: string, clause: string): string => {
  const root = parseEsqlQuery(query);
  const command =
    root && topLevelCommands(root, 'where').find((c) => whereExpression(c) === clause);
  if (!root || !command) return query;
  return (
    query.slice(0, commandLeadStart(query, root, command)) + query.slice(command.location.max + 1)
  );
};

/** The exact prefix `appendMapClause` writes, which `removeMapSetResidue` takes back off. */
export const MAP_SET_PREFIX = 'SET unmapped_fields="NULLIFY";\n';

/**
 * Append a WHERE clause the map writes. It names fields of every trace family (`duration` of
 * OTel, `span.duration.us` of classic APM, `status.code`), and a source that maps only some of
 * them would fail with an unknown column, so the query gets `SET unmapped_fields="NULLIFY"`, as
 * the map's own queries have, unless it already sets it - or unless the host knows every
 * referenced field is mapped (`nullify: false`, from a field-caps check), which keeps the
 * user's query as short as it can be.
 *
 * The clause goes before the query's first LIMIT, when it has one: the map shows every span
 * of the range, so a region drawn on it must select among all of them, not among the rows
 * the limit happened to keep.
 */
export const appendMapClause = (
  query: string,
  clause: string,
  { nullify = true }: { nullify?: boolean } = {}
): string => {
  const root = parseEsqlQuery(query);
  const [limit] = root ? topLevelCommands(root, 'limit') : [];
  const leadStart = root && limit ? commandLeadStart(query, root, limit) : undefined;
  const appended =
    leadStart !== undefined
      ? `${query.slice(0, leadStart)}\n| WHERE ${clause}${query.slice(leadStart)}`
      : appendToESQLQuery(query, `| WHERE ${clause}`);
  const hasSet = root
    ? mutate.commands.set.findBySettingName(root, 'unmapped_fields') !== undefined
    : /\bSET\s+unmapped_fields\b/i.test(query);
  return !nullify || hasSet ? appended : `${MAP_SET_PREFIX}${appended}`;
};

const isMapClause = (condition: string) =>
  isSelectionCondition(condition) ||
  isFailedOnlyCondition(condition) ||
  isOperationCondition(condition);

/**
 * Take the map's own `SET unmapped_fields` prefix back off once no clause of the map
 * remains to need it, so clearing the last map filter restores the user's query exactly.
 * Only the exact text `appendMapClause` wrote is touched: a SET the user typed with any
 * other spacing stays.
 *
 * The prefix is recognised by its text, not by remembering that the map wrote it: the query
 * is the only state that survives a reload or a shared link, and the map's own SET left
 * behind after Clear would read as the map corrupting the query. The cost is the rare case
 * of a user typing the byte-exact prefix and then clearing the last map clause, which
 * retyping the SET recovers.
 */
export const removeMapSetResidue = (query: string): string =>
  query.startsWith(MAP_SET_PREFIX) && !extractFilters(query).some(isMapClause)
    ? query.slice(MAP_SET_PREFIX.length)
    : query;

/**
 * Replace the map's clause of one kind (the selection, the focused operation, "failed
 * only": `isClause` tells it) with `clause`, or take it out when there is none to write.
 * Every clause of the kind in the query goes, wherever it sits, so a second commit never
 * stacks on the first; once the last map clause is gone, the map's own SET prefix goes too.
 */
export const replaceMapClause = (
  query: string,
  isClause: (condition: string) => boolean,
  clause: string | undefined,
  { nullify }: { nullify?: boolean } = {}
): string => {
  const without = extractFilters(query).filter(isClause).reduce(removeWhere, query);
  return clause ? appendMapClause(without, clause, { nullify }) : removeMapSetResidue(without);
};
