/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Parser,
  Walker,
  isBinaryExpression,
  isColumn,
  isFunctionExpression,
  isLiteral,
  isUnaryExpression,
} from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ProjectRouting } from '@kbn/es-query';
import { uniq } from 'lodash';
import { z } from '@kbn/zod';
import {
  FilterExpressionSchema,
  FilterOperator,
  type FilterExpressionValue,
} from './filter_input_codec';

const projectRoutingClausePattern = /([^:\s()]+):([^()\s]+)/g;

export const ROUTING_WILDCARD = '*';

/** Reserved routing dimension for project selection/exclusion — never a filter badge. */
export const PROJECT_SELECTION_DIMENSION = '_id' as const;

export const ProjectRoutingStrategySchema = z.enum(['dynamic', 'snapshot', 'unknown']);
export type ProjectRoutingStrategy = z.output<typeof ProjectRoutingStrategySchema>;

export const ProjectRoutingExpressionSchema = z.strictObject({
  filterExpressions: z.array(FilterExpressionSchema).max(100),
  excludedProjectIds: z.array(z.string().max(256)).max(1000),
  selectedProjectIds: z.array(z.string().max(256)).max(1000),
  projectRoutingStrategy: ProjectRoutingStrategySchema,
});

export type ProjectRoutingExpression = z.output<typeof ProjectRoutingExpressionSchema>;

interface TagEquality {
  tagName: string;
  tagValue: string;
}

/**
 * Converts project routing Lucene query syntax string to an ESQL expression string,
 * so we might use the ESQL parser to extract boolean conditions.
 */
const luceneQuerySyntaxToEsqlExpression = (clause: NonNullable<ProjectRouting>): string => {
  const trimmed = clause.trim();

  if (!trimmed.includes(':')) {
    throw new Error('Invalid project routing Lucene clause: missing tag:value atom');
  }

  return trimmed.replace(projectRoutingClausePattern, (_, tagName, tagValue) => {
    const escapedValue = tagValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${tagName} == "${escapedValue}"`;
  });
};

const encodeTagFilterClause = ({ operator, tagName, tagValue }: FilterExpressionValue): string => {
  switch (operator) {
    case FilterOperator.EQUALS:
      return `${tagName}:${tagValue}`;
    case FilterOperator.NOT_EQUALS:
      return `(${tagName}:* AND NOT ${tagName}:${tagValue})`;
    case FilterOperator.ONE_OF:
      return `(${tagValue.map((value) => `${tagName}:${value}`).join(' OR ')})`;
    case FilterOperator.NOT_ONE_OF:
      return `(${tagName}:* AND NOT (${tagValue
        .map((value) => `${tagName}:${value}`)
        .join(' OR ')}))`;
    case FilterOperator.EXISTS:
      return `${tagName}:*`;
    case FilterOperator.NOT_EXISTS:
      return `NOT ${tagName}:*`;
    default: {
      const _exhaustive: never = operator;
      throw new Error(`Unsupported filter operator: ${String(_exhaustive)}`);
    }
  }
};

const decodeTagFilterClause = (value: string): FilterExpressionValue => {
  if (value.trim() === '') {
    throw new Error('Cannot decode empty project routing clause');
  }

  const trimmed = value.trim();

  if (trimmed.startsWith('@')) {
    throw new Error('Cannot decode named project routing reference');
  }

  if (!trimmed.includes(':')) {
    throw new Error('Invalid project routing Lucene clause: missing tag:value atom');
  }

  const esqlExpression = luceneQuerySyntaxToEsqlExpression(trimmed);

  let root: ESQLAstExpression;
  try {
    ({ root } = Parser.parseExpression(esqlExpression));
  } catch (error) {
    throw new Error(
      `Cannot parse project routing clause: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return filterExpressionFromRoutingAst(root);
};

/** Reads a `tag == "value"` binary expression; returns null for any other node shape. */
const readTagEqualityNode = (node: unknown): TagEquality | null => {
  if (!isBinaryExpression(node) || node.name !== '==') {
    return null;
  }

  const [columnNode, valueNode] = node.args;
  if (!isColumn(columnNode) || !isLiteral(valueNode) || valueNode.literalType !== 'keyword') {
    return null;
  }

  const tagValue = valueNode.valueUnquoted;
  if (tagValue === undefined) {
    return null;
  }

  return {
    tagName: columnNode.name,
    tagValue,
  };
};

const readTagEquality = (node: unknown): TagEquality => {
  const equality = readTagEqualityNode(node);
  if (!equality) {
    throw new Error('Expected project routing column == string literal');
  }
  return equality;
};

const readSameTagEqualities = (nodes: unknown[]): TagEquality[] => {
  const equalities = nodes.map(readTagEquality);
  const tagName = equalities[0]?.tagName;

  if (!tagName || !equalities.every(({ tagName: columnName }) => columnName === tagName)) {
    throw new Error('Invalid project routing OR group: mixed tag names');
  }

  if (equalities.some(({ tagValue }) => tagValue === ROUTING_WILDCARD)) {
    throw new Error('Invalid project routing OR group: wildcard values not allowed');
  }

  return equalities;
};

const filterExpressionFromRoutingAst = (node: ESQLAstExpression): FilterExpressionValue => {
  if (!isFunctionExpression(node)) {
    throw new Error('Cannot decode project routing clause');
  }

  if (node.name === 'not') {
    const { tagName, tagValue } = readTagEquality(node.args[0]);
    if (tagValue !== ROUTING_WILDCARD) {
      throw new Error('Cannot decode project routing NOT EXISTS clause');
    }

    return {
      operator: FilterOperator.NOT_EXISTS,
      tagName,
      tagValue: undefined,
    };
  }

  if (node.name === '==') {
    const { tagName, tagValue } = readTagEquality(node);
    if (tagValue === ROUTING_WILDCARD) {
      return {
        operator: FilterOperator.EXISTS,
        tagName,
        tagValue: undefined,
      };
    }

    return {
      operator: FilterOperator.EQUALS,
      tagName,
      tagValue,
    };
  }

  if (node.name === 'or') {
    const equalities = readSameTagEqualities(node.args);
    return {
      operator: FilterOperator.ONE_OF,
      tagName: equalities[0].tagName,
      tagValue: equalities.map(({ tagValue }) => tagValue),
    };
  }

  if (node.name === 'and') {
    if (node.args.length !== 2) {
      throw new Error('Cannot decode project routing AND clause');
    }

    const [existsNode, negatedNode] = node.args;
    const existsEquality = readTagEquality(existsNode);
    if (existsEquality.tagValue !== ROUTING_WILDCARD) {
      throw new Error('Cannot decode project routing AND clause');
    }

    if (!isFunctionExpression(negatedNode) || negatedNode.name !== 'not') {
      throw new Error('Cannot decode project routing AND clause');
    }

    const negatedExpression = negatedNode.args[0];
    if (isFunctionExpression(negatedExpression) && negatedExpression.name === 'or') {
      const equalities = readSameTagEqualities(negatedExpression.args);
      if (existsEquality.tagName !== equalities[0].tagName) {
        throw new Error('Invalid project routing NOT ONE OF clause: tag name mismatch');
      }

      return {
        operator: FilterOperator.NOT_ONE_OF,
        tagName: existsEquality.tagName,
        tagValue: equalities.map(({ tagValue }) => tagValue),
      };
    }

    const notEqualsEquality = readTagEquality(negatedExpression);
    if (existsEquality.tagName !== notEqualsEquality.tagName) {
      throw new Error('Invalid project routing NOT EQUALS clause: tag name mismatch');
    }

    return {
      operator: FilterOperator.NOT_EQUALS,
      tagName: existsEquality.tagName,
      tagValue: notEqualsEquality.tagValue,
    };
  }

  throw new Error('Cannot decode project routing clause');
};

const unknownRoutingExpression = (
  filterExpressions: FilterExpressionValue[] = []
): ProjectRoutingExpression => ({
  filterExpressions,
  excludedProjectIds: [],
  selectedProjectIds: [],
  projectRoutingStrategy: 'unknown',
});

/**
 * Flattens a left-associative chain of the given binary operator into its operand list in
 * source order. Iterative on purpose: routing strings are not schema-bounded before decode,
 * so a very long `a AND b AND c AND …` chain must not overflow the call stack.
 */
const collectBinaryChainOperands = (
  root: ESQLAstExpression,
  operatorName: 'and' | 'or'
): ESQLAstExpression[] => {
  const operands: ESQLAstExpression[] = [];
  const stack: ESQLAstExpression[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;

    if (isBinaryExpression(node) && node.name === operatorName) {
      for (let index = node.args.length - 1; index >= 0; index--) {
        stack.push(node.args[index] as ESQLAstExpression);
      }
      continue;
    }

    operands.push(node);
  }

  return operands;
};

const collectAndConjuncts = (root: ESQLAstExpression): ESQLAstExpression[] =>
  collectBinaryChainOperands(root, 'and');

const collectOrDisjuncts = (root: ESQLAstExpression): ESQLAstExpression[] =>
  collectBinaryChainOperands(root, 'or');

/**
 * Reads a `_id == value` equality on the reserved project selection dimension;
 * returns null when the node targets any other column or is not an equality.
 */
const readSelectionDimensionEquality = (
  node: ESQLAstExpression
): { projectId: string; isWildcard: boolean } | null => {
  const equality = readTagEqualityNode(node);

  if (!equality || equality.tagName !== PROJECT_SELECTION_DIMENSION) {
    return null;
  }

  return {
    projectId: equality.tagValue,
    isWildcard: equality.tagValue === ROUTING_WILDCARD,
  };
};

/**
 * Reads the excluded project ids from a `NOT _id:x` / `NOT (_id:a OR _id:b)` negation.
 * Returns null for any other shape, including wildcard ids or non-selection columns.
 */
const readExcludedProjectIds = (node: ESQLAstExpression): string[] | null => {
  if (!isUnaryExpression(node) || node.name !== 'not') {
    return null;
  }

  const negated = node.args[0] as ESQLAstExpression;

  const single = readSelectionDimensionEquality(negated);
  if (single) {
    return single.isWildcard ? null : [single.projectId];
  }

  if (!isBinaryExpression(negated) || negated.name !== 'or') {
    return null;
  }

  const projectIds: string[] = [];
  for (const disjunct of collectOrDisjuncts(negated)) {
    const equality = readSelectionDimensionEquality(disjunct);
    if (!equality || equality.isWildcard) {
      return null;
    }
    projectIds.push(equality.projectId);
  }

  return projectIds;
};

/**
 * Reads the selected project ids from a `_id:x` equality or a `(_id:a OR _id:b …)` OR group.
 * Returns null for any other shape, including wildcard ids or non-selection columns.
 */
const readSelectedProjectIds = (node: ESQLAstExpression): string[] | null => {
  const single = readSelectionDimensionEquality(node);
  if (single) {
    return single.isWildcard ? null : [single.projectId];
  }

  if (!isBinaryExpression(node) || node.name !== 'or') {
    return null;
  }

  const projectIds: string[] = [];
  for (const disjunct of collectOrDisjuncts(node)) {
    const equality = readSelectionDimensionEquality(disjunct);
    if (!equality || equality.isWildcard) {
      return null;
    }
    projectIds.push(equality.projectId);
  }

  return projectIds;
};

/**
 * Guards that a filter subtree never references the reserved project selection dimension,
 * so `_id` clauses can never leak into decoded filter expressions.
 */
const assertSelectionDimensionFree = (node: ESQLAstExpression): void => {
  const selectionColumn = Walker.find(
    node,
    (child) => isColumn(child) && child.name === PROJECT_SELECTION_DIMENSION
  );

  if (selectionColumn) {
    throw new Error('Project selection dimension is not a valid filter tag');
  }
};

/**
 * Reads a NOT_EQUALS / NOT_ONE_OF filter spanning two adjacent conjuncts — `tag:*` followed
 * by `NOT tag:value` or `NOT (tag:a OR tag:b)` — as produced by {@link encodeTagFilterClause}.
 * Returns null when the pair is not that shape.
 */
const readCompoundFilterPair = (
  existsNode: ESQLAstExpression,
  negationNode: ESQLAstExpression
): FilterExpressionValue | null => {
  const existsEquality = readTagEqualityNode(existsNode);
  if (!existsEquality || existsEquality.tagValue !== ROUTING_WILDCARD) {
    return null;
  }

  if (!isUnaryExpression(negationNode) || negationNode.name !== 'not') {
    return null;
  }

  const negated = negationNode.args[0] as ESQLAstExpression;

  const single = readTagEqualityNode(negated);
  if (single) {
    if (single.tagName !== existsEquality.tagName || single.tagValue === ROUTING_WILDCARD) {
      return null;
    }

    return {
      operator: FilterOperator.NOT_EQUALS,
      tagName: existsEquality.tagName,
      tagValue: single.tagValue,
    };
  }

  if (!isBinaryExpression(negated) || negated.name !== 'or') {
    return null;
  }

  const tagValues: string[] = [];
  for (const disjunct of collectOrDisjuncts(negated)) {
    const equality = readTagEqualityNode(disjunct);
    if (
      !equality ||
      equality.tagName !== existsEquality.tagName ||
      equality.tagValue === ROUTING_WILDCARD
    ) {
      return null;
    }
    tagValues.push(equality.tagValue);
  }

  return {
    operator: FilterOperator.NOT_ONE_OF,
    tagName: existsEquality.tagName,
    tagValue: tagValues,
  };
};

/**
 * Decodes a run of conjuncts (selection clauses already partitioned out) into the filter
 * expressions it represents. A single filter can span two adjacent conjuncts — the
 * `tag:* AND NOT tag:value` / `tag:* AND NOT (a OR b)` shape produced by
 * {@link encodeTagFilterClause} — so pairs are read before single nodes. Strict: throws when
 * any conjunct is unrecognized or references the reserved selection dimension, so malformed
 * strings surface as an unknown strategy instead of silently dropping clauses.
 */
const decodeFilterConjuncts = (nodes: readonly ESQLAstExpression[]): FilterExpressionValue[] => {
  for (const node of nodes) {
    assertSelectionDimensionFree(node);
  }

  const expressions: FilterExpressionValue[] = [];
  let index = 0;

  while (index < nodes.length) {
    const compound =
      index + 1 < nodes.length ? readCompoundFilterPair(nodes[index], nodes[index + 1]) : null;

    if (compound) {
      expressions.push(compound);
      index += 2;
      continue;
    }

    expressions.push(filterExpressionFromRoutingAst(nodes[index]));
    index += 1;
  }

  return expressions;
};

interface RoutingConjunctPartition {
  /** Ids collected from `_id:x` / `(_id:a OR _id:b)` selection conjuncts, in source order. */
  selectedProjectIds: string[];
  /** Number of selection conjuncts the ids above came from. */
  selectionConjunctCount: number;
  /** Number of `_id:*` wildcard equalities. */
  wildcardCount: number;
  /** Ids collected from `NOT _id:…` exclusion negations, in source order. */
  excludedProjectIds: string[];
  /** Number of exclusion negation conjuncts the ids above came from. */
  exclusionCount: number;
  /** Every other conjunct (free tag filters and compound tails). */
  freeNodes: ESQLAstExpression[];
}

/** Classifies each top-level conjunct exactly once into the buckets strategy detection needs. */
const partitionRoutingConjuncts = (
  conjuncts: readonly ESQLAstExpression[]
): RoutingConjunctPartition => {
  const partition: RoutingConjunctPartition = {
    selectedProjectIds: [],
    selectionConjunctCount: 0,
    wildcardCount: 0,
    excludedProjectIds: [],
    exclusionCount: 0,
    freeNodes: [],
  };

  for (const conjunct of conjuncts) {
    const equality = readSelectionDimensionEquality(conjunct);
    if (equality?.isWildcard) {
      partition.wildcardCount += 1;
      continue;
    }

    const selections = readSelectedProjectIds(conjunct);
    if (selections) {
      partition.selectedProjectIds.push(...selections);
      partition.selectionConjunctCount += 1;
      continue;
    }

    const exclusions = readExcludedProjectIds(conjunct);
    if (exclusions) {
      partition.excludedProjectIds.push(...exclusions);
      partition.exclusionCount += 1;
      continue;
    }

    partition.freeNodes.push(conjunct);
  }

  return partition;
};

/**
 * Detects the routing strategy from the shape of the top-level AND conjuncts, then reads the
 * matching tail. `_id` is the reserved project selection dimension.
 *
 * snapshot
 * 1.1 a single `(_id:a OR _id:b …)` OR group of non-wildcard `_id:value` equalities →
 *     selected ids
 * 1.2 a single `_id:value` equality → selected id
 * 1.3 shape 1.1/1.2 beside free tag-filter conjuncts (columns other than `_id`) → filters +
 *     selected ids; every free conjunct must decode strictly
 *
 * dynamic
 * 2.1 a lone `_id:*` wildcard → all projects, no exclusions
 * 2.2 one `_id:*` plus one `NOT _id:x` / `NOT (_id:a OR _id:b)` negation → excluded ids
 * 2.3 shape 2.2 preceded by free tag-filter conjuncts (columns other than `_id`) → filters +
 *     excluded ids; every free conjunct must decode strictly
 *
 * unknown
 * 3.1 blank, `@named`, or unparseable input (handled before this function)
 * 3.2 conjuncts that are only tag filters, with no `_id` clauses — filters are still recovered
 * 3.3 any other mix: `_id:*` without its negation, extra wildcards/negations, more than one
 *     selection conjunct, `_id` appearing inside a filter subtree, or a free conjunct that
 *     fails strict decoding
 */
const decodeRoutingExpressionAst = (root: ESQLAstExpression): ProjectRoutingExpression => {
  const conjuncts = collectAndConjuncts(root);
  const {
    selectedProjectIds,
    selectionConjunctCount,
    wildcardCount,
    excludedProjectIds,
    exclusionCount,
    freeNodes,
  } = partitionRoutingConjuncts(conjuncts);

  const hasSingleSelectionConjunct =
    selectionConjunctCount === 1 && wildcardCount === 0 && exclusionCount === 0;

  if (hasSingleSelectionConjunct) {
    try {
      return {
        filterExpressions: decodeFilterConjuncts(freeNodes),
        excludedProjectIds: [],
        selectedProjectIds: uniq(selectedProjectIds),
        projectRoutingStrategy: 'snapshot',
      };
    } catch {
      return unknownRoutingExpression();
    }
  }

  if (conjuncts.length === 1 && wildcardCount === 1) {
    return {
      filterExpressions: [],
      excludedProjectIds: [],
      selectedProjectIds: [],
      projectRoutingStrategy: 'dynamic',
    };
  }

  if (wildcardCount === 1 && exclusionCount === 1 && selectionConjunctCount === 0) {
    try {
      return {
        filterExpressions: decodeFilterConjuncts(freeNodes),
        excludedProjectIds: uniq(excludedProjectIds),
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic',
      };
    } catch {
      return unknownRoutingExpression();
    }
  }

  const hasNoSelectionClauses =
    selectionConjunctCount === 0 && wildcardCount === 0 && exclusionCount === 0;

  if (hasNoSelectionClauses && freeNodes.length > 0) {
    try {
      return unknownRoutingExpression(decodeFilterConjuncts(freeNodes));
    } catch {
      return unknownRoutingExpression();
    }
  }

  return unknownRoutingExpression();
};

/**
 * Builds the `_id` selection clause. The clause is only parenthesized when filter clauses
 * precede it in the encoded output — standalone it is the whole expression, so grouping
 * parentheses add nothing.
 */
const buildProjectSelectionClauses = ({
  excludedProjectIds,
  selectedProjectIds,
  projectRoutingStrategy,
  hasFilterClauses,
}: Pick<
  z.infer<typeof ProjectRoutingExpressionSchema>,
  'excludedProjectIds' | 'selectedProjectIds'
> & {
  projectRoutingStrategy: Exclude<ProjectRoutingStrategy, 'unknown'>;
  hasFilterClauses: boolean;
}): string => {
  if (projectRoutingStrategy === 'dynamic') {
    if (excludedProjectIds.length === 0) {
      return '';
    }

    const excludedProjectsSelection = excludedProjectIds
      .map((override) => `${PROJECT_SELECTION_DIMENSION}:${override}`)
      .join(' OR ');

    const dynamicSelection = [
      `${PROJECT_SELECTION_DIMENSION}:${ROUTING_WILDCARD}`,
      excludedProjectIds.length > 1
        ? `NOT (${excludedProjectsSelection})`
        : `NOT ${excludedProjectsSelection}`,
    ].join(' AND ');

    return hasFilterClauses ? `(${dynamicSelection})` : dynamicSelection;
  }

  if (selectedProjectIds.length === 0) {
    return '';
  }

  const selectedProjectsSelection = selectedProjectIds
    .map((id) => `${PROJECT_SELECTION_DIMENSION}:${id}`)
    .join(' OR ');

  return selectedProjectIds.length > 1 && hasFilterClauses
    ? `(${selectedProjectsSelection})`
    : selectedProjectsSelection;
};

/**
 * Project routing codec, leverages zod for validation and transforms.
 *
 * @note This codec only supports parsing direct project routing expressions,
 * named project routing expressions if ever provided will return empty values on all fields
 * as we are unable to infer what expressions the named project routing expression represents
 * without asking a server.
 */
export const projectRoutingCodec = z.codec(z.optional(z.string()), ProjectRoutingExpressionSchema, {
  encode: (input) => {
    const filterClauses = input.filterExpressions.map((expression) =>
      encodeTagFilterClause(expression)
    );

    if (input.projectRoutingStrategy === 'unknown') {
      throw new Error('project routing strategy unknown is not valid for encoding');
    }

    const projectSelectionClauses = buildProjectSelectionClauses({
      excludedProjectIds: input.excludedProjectIds,
      selectedProjectIds: input.selectedProjectIds,
      projectRoutingStrategy: input.projectRoutingStrategy,
      hasFilterClauses: filterClauses.length > 0,
    });

    return filterClauses.concat(projectSelectionClauses).filter(Boolean).join(' AND ');
  },
  decode: (value) => {
    const trimmed = value?.trim();

    if (!trimmed || trimmed.startsWith('@')) {
      return unknownRoutingExpression();
    }

    let root: ESQLAstExpression;

    try {
      ({ root } = Parser.parseExpression(luceneQuerySyntaxToEsqlExpression(trimmed)));
    } catch {
      return unknownRoutingExpression();
    }

    return decodeRoutingExpressionAst(root);
  },
});

/** Decode a single Lucene tag-filter routing clause (for tests and internal round-trips). */
export const decodeTagFilterRoutingClause = decodeTagFilterClause;

/** Encode a single Lucene tag-filter routing clause (for tests and internal round-trips). */
export const encodeTagFilterRoutingClause = encodeTagFilterClause;

/**
 * Encodes enabled tag filter expressions into a project routing string with no `_id`
 * selection/exclusion clauses. Used for server-side filter search.
 * Returns `undefined` when there are no filter expressions to encode.
 */
export const encodeFilterOnlyRouting = (
  filterExpressions: readonly FilterExpressionValue[]
): ProjectRouting | undefined => {
  if (filterExpressions.length === 0) {
    return undefined;
  }

  const encoded = filterExpressions.map(encodeTagFilterClause).filter(Boolean).join(' AND ');
  return encoded.length > 0 ? encoded : undefined;
};
