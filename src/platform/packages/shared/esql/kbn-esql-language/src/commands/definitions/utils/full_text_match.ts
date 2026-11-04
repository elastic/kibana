/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isColumn, isFunctionExpression, isParamLiteral } from '@elastic/esql';
import type { ESQLAstItem } from '@elastic/esql/types';
import type { ESQLColumnData } from '../../registry/types';
import { METADATA_FIELDS } from '../../registry/options/metadata';

/** Full-text functions whose first argument is the field they search. */
const FIELD_TARGETING_FUNCTIONS = ['match', 'match_phrase', ':'];

/** Full-text functions that name no field, so they apply to every text column. */
const NON_TARGETING_FUNCTIONS = ['qstr', 'kql'];

const TEXT_COLUMN_TYPES = ['text', 'keyword', 'semantic_text'];

const SYNTHETIC_COLUMN_PREFIX = '$$';

/** The columns a full-text search can target: text-like, and neither metadata nor synthetic. */
export const isTextColumn = ({ name, type }: ESQLColumnData): boolean =>
  TEXT_COLUMN_TYPES.includes(type) &&
  !METADATA_FIELDS.includes(name) &&
  !name.startsWith(SYNTHETIC_COLUMN_PREFIX);

export interface FullTextTargets {
  /** Columns named by field-targeting conditions. */
  fields: Set<string>;
  /** Whether a condition that names no field applies, so every text column is a target. */
  all: boolean;
}

const splitAnd = (expression: ESQLAstItem): ESQLAstItem[] =>
  !Array.isArray(expression) && isFunctionExpression(expression) && expression.name === 'and'
    ? expression.args.flatMap(splitAnd)
    : [expression];

/** AND/OR combinations of positive full-text conditions; NOT and mixed predicates are not. */
const isReusableCondition = (expression: ESQLAstItem): boolean => {
  if (Array.isArray(expression) || !isFunctionExpression(expression)) {
    return false;
  }

  const name = expression.name.toLowerCase();

  if (name === 'and' || name === 'or') {
    return expression.args.every(isReusableCondition);
  }

  return FIELD_TARGETING_FUNCTIONS.includes(name) || NON_TARGETING_FUNCTIONS.includes(name);
};

const collectTargets = (expression: ESQLAstItem, targets: FullTextTargets): void => {
  if (Array.isArray(expression) || !isFunctionExpression(expression)) {
    return;
  }

  const name = expression.name.toLowerCase();

  if (NON_TARGETING_FUNCTIONS.includes(name)) {
    targets.all = true;
  } else if (FIELD_TARGETING_FUNCTIONS.includes(name)) {
    const [field] = expression.args;

    // A field that cannot be resolved here, such as a parameter, could be any text column.
    if (!Array.isArray(field) && isColumn(field) && !field.args.some(isParamLiteral)) {
      targets.fields.add(field.name);
    } else {
      targets.all = true;
    }
  } else {
    expression.args.forEach((arg) => collectTargets(arg, targets));
  }
};

/**
 * The columns the positive full-text conditions of a WHERE target. Only the AND-ed conditions
 * made of MATCH, MATCH_PHRASE, the match operator, QSTR and KQL count; negated conditions, and
 * full-text conditions mixed with other filters, are left out.
 */
export const getFullTextTargets = (condition: ESQLAstItem): FullTextTargets => {
  const targets: FullTextTargets = { fields: new Set(), all: false };

  splitAnd(condition)
    .filter(isReusableCondition)
    .forEach((c) => collectTargets(c, targets));

  return targets;
};
