/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, isColumn, isFunctionExpression, isLiteral } from '@elastic/esql';
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
export const PROJECT_SELECTION_DIMENSION = '_id';

export const ProjectRoutingStrategySchema = z.enum(['dynamic', 'snapshot']);
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
      return `${tagName}:* AND NOT ${tagName}:${tagValue}`;
    case FilterOperator.ONE_OF:
      return `(${tagValue.map((value) => `${tagName}:${value}`).join(' OR ')})`;
    case FilterOperator.NOT_ONE_OF:
      return `${tagName}:* AND NOT (${tagValue
        .map((value) => `${tagName}:${value}`)
        .join(' OR ')})`;
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

const readTagEquality = (node: unknown): TagEquality => {
  if (!isFunctionExpression(node) || node.name !== '==') {
    throw new Error('Expected project routing equality expression');
  }

  const [columnNode, valueNode] = node.args;
  if (!isColumn(columnNode) || !isLiteral(valueNode) || valueNode.literalType !== 'keyword') {
    throw new Error('Expected project routing column == string literal');
  }

  const tagValue = valueNode.valueUnquoted;
  if (tagValue === undefined) {
    throw new Error('Expected project routing literal value');
  }

  return {
    tagName: columnNode.name,
    tagValue,
  };
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

const flattenTopLevelAndArgs = (root: ESQLAstExpression): ESQLAstExpression[] => {
  if (isFunctionExpression(root) && root.name === 'and') {
    return root.args.flatMap((arg) => flattenTopLevelAndArgs(arg as ESQLAstExpression));
  }

  return [root];
};

const createSyntheticAndNode = (nodes: readonly ESQLAstExpression[]): ESQLAstExpression => {
  if (nodes.length === 1) {
    return nodes[0];
  }

  return {
    type: 'function',
    name: 'and',
    args: [...nodes],
  } as ESQLAstExpression;
};

const readIdEquality = (
  node: ESQLAstExpression
): { projectId: string; isWildcard: boolean } | null => {
  if (!isFunctionExpression(node) || node.name !== '==') {
    return null;
  }

  try {
    const { tagName, tagValue } = readTagEquality(node);

    if (tagName !== PROJECT_SELECTION_DIMENSION) {
      return null;
    }

    return {
      projectId: tagValue,
      isWildcard: tagValue === ROUTING_WILDCARD,
    };
  } catch {
    return null;
  }
};

const readIdExclusion = (node: ESQLAstExpression): string | null => {
  if (!isFunctionExpression(node) || node.name !== 'not') {
    return null;
  }

  const inner = node.args[0];
  if (!isFunctionExpression(inner) || inner.name !== '==') {
    return null;
  }

  try {
    const { tagName, tagValue } = readTagEquality(inner);

    if (tagName !== PROJECT_SELECTION_DIMENSION || tagValue === ROUTING_WILDCARD) {
      return null;
    }

    return tagValue;
  } catch {
    return null;
  }
};

/**
 * Decodes a run of top-level AND nodes (with `_id` clauses already stripped out) into the
 * filter expressions it represents. A single filter can itself span two adjacent nodes — the
 * `tag:* AND NOT tag:value` / `tag:* AND NOT (a OR b)` shape produced by {@link encodeTagFilterClause}
 * for `NOT_EQUALS`/`NOT_ONE_OF` — so pairs are tried greedily before falling back to decoding a
 * node on its own, which keeps independent filters that happen to be ANDed together from being
 * discarded as a single unrecognized group.
 */
const decodeFilterNodeGroup = (nodes: readonly ESQLAstExpression[]): FilterExpressionValue[] => {
  const expressions: FilterExpressionValue[] = [];
  let index = 0;

  while (index < nodes.length) {
    const pairCandidate = nodes[index + 1];

    if (pairCandidate) {
      try {
        expressions.push(
          filterExpressionFromRoutingAst(createSyntheticAndNode([nodes[index], pairCandidate]))
        );
        index += 2;
        continue;
      } catch {
        // not a recognized two-node pattern — fall through and try the node on its own.
      }
    }

    try {
      expressions.push(filterExpressionFromRoutingAst(nodes[index]));
    } catch {
      // unrecognized clause — skip it rather than losing the rest of the group.
    }
    index += 1;
  }

  return expressions;
};

const buildProjectSelectionClauses = ({
  excludedProjectIds,
  selectedProjectIds,
  projectRoutingStrategy,
}: Pick<
  z.infer<typeof ProjectRoutingExpressionSchema>,
  'excludedProjectIds' | 'selectedProjectIds' | 'projectRoutingStrategy'
>): string[] => {
  if (projectRoutingStrategy === 'dynamic') {
    return excludedProjectIds.length === 0
      ? []
      : [
          `${PROJECT_SELECTION_DIMENSION}:${ROUTING_WILDCARD}`,
          ...excludedProjectIds.map((override) => `NOT ${PROJECT_SELECTION_DIMENSION}:${override}`),
        ];
  }

  return selectedProjectIds.map((id) => `${PROJECT_SELECTION_DIMENSION}:${id}`);
};

/**
 * Codec for project routing, leverages zod for validation and transforms.
 */
export const projectRoutingCodec = z.codec(z.optional(z.string()), ProjectRoutingExpressionSchema, {
  encode: (input) => {
    const filterClauses = input.filterExpressions.map((expression) =>
      encodeTagFilterClause(expression)
    );

    return [
      ...filterClauses,
      ...buildProjectSelectionClauses({
        excludedProjectIds: input.excludedProjectIds,
        selectedProjectIds: input.selectedProjectIds,
        projectRoutingStrategy: input.projectRoutingStrategy,
      }),
    ]
      .filter(Boolean)
      .join(' AND ');
  },
  decode: (value) => {
    const trimmed = value?.trim();

    if (!trimmed || trimmed.startsWith('@')) {
      return {
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic' as const,
      };
    }

    let root: ESQLAstExpression;

    try {
      ({ root } = Parser.parseExpression(luceneQuerySyntaxToEsqlExpression(trimmed)));
    } catch {
      return {
        filterExpressions: [],
        excludedProjectIds: [],
        selectedProjectIds: [],
        projectRoutingStrategy: 'dynamic' as const,
      };
    }

    const filterExpressions: FilterExpressionValue[] = [];
    const excludedProjectIds: string[] = [];
    const selectedProjectIds: string[] = [];
    let pendingFilterNodes: ESQLAstExpression[] = [];

    const flushFilterGroup = () => {
      filterExpressions.push(...decodeFilterNodeGroup(pendingFilterNodes));
      pendingFilterNodes = [];
    };

    for (const node of flattenTopLevelAndArgs(root)) {
      const idEquality = readIdEquality(node);

      if (idEquality) {
        flushFilterGroup();

        if (!idEquality.isWildcard) {
          selectedProjectIds.push(idEquality.projectId);
        }

        continue;
      }

      const excludedId = readIdExclusion(node);

      if (excludedId) {
        flushFilterGroup();
        excludedProjectIds.push(excludedId);
        continue;
      }

      pendingFilterNodes.push(node);
    }

    flushFilterGroup();

    return {
      filterExpressions,
      excludedProjectIds: uniq(excludedProjectIds),
      selectedProjectIds: uniq(selectedProjectIds),
      projectRoutingStrategy: (excludedProjectIds.length > 0
        ? 'dynamic'
        : 'snapshot') as ProjectRoutingStrategy,
    };
  },
});

/** Decode a single Lucene tag-filter routing clause (for tests and internal round-trips). */
export const decodeTagFilterRoutingClause = decodeTagFilterClause;

/** Encode a single Lucene tag-filter routing clause (for tests and internal round-trips). */
export const encodeTagFilterRoutingClause = encodeTagFilterClause;
