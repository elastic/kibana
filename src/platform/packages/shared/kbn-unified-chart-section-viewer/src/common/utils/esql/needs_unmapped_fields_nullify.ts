/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isColumn,
  isESQLFunction,
  isList,
  isLiteral,
  isParamLiteral,
  isParens,
  Parser,
} from '@elastic/esql';
import type { ESQLAstItem } from '@elastic/esql';
import { fieldConstants } from '@kbn/discover-utils';
import {
  comparisonFunctions,
  logicalOperators,
  nullCheckOperators,
  operatorsDefinitions,
} from '@kbn/esql-language';

const {
  TIMESTAMP_FIELD,
  DATASTREAM_TYPE_FIELD,
  DATASTREAM_DATASET_FIELD,
  DATASTREAM_NAMESPACE_FIELD,
} = fieldConstants;

/** Fields present on every time-series metric stream. */
const ALWAYS_MAPPED_FIELDS: ReadonlySet<string> = new Set([
  TIMESTAMP_FIELD,
  DATASTREAM_TYPE_FIELD,
  DATASTREAM_DATASET_FIELD,
  DATASTREAM_NAMESPACE_FIELD,
]);

const isAlwaysMappedField = (field: string): boolean => ALWAYS_MAPPED_FIELDS.has(field);

/**
 * True when every column in the expression is in {@link ALWAYS_MAPPED_FIELDS}.
 * Parameters, unknown nodes, and functions other than comparison, logical, and null checks are unsafe.
 */
const isSafeExpression = (node: ESQLAstItem): boolean => {
  if (Array.isArray(node)) {
    return node.every(isSafeExpression);
  }

  if (isParens(node)) {
    return isSafeExpression(node.child);
  }

  if (isESQLFunction(node)) {
    const isSafeOperator = [
      ...comparisonFunctions.map(({ name }) => name),
      ...logicalOperators.map(({ name }) => name),
      ...nullCheckOperators.map(({ name }) => name),
      operatorsDefinitions.find((operator) => operator.name === 'not')?.name,
    ].includes(node.name);

    return isSafeOperator && isSafeExpression(node.args);
  }

  if (isLiteral(node)) {
    return !isParamLiteral(node);
  }

  if (isColumn(node)) {
    return isAlwaysMappedField(node.name);
  }

  if (isList(node)) {
    return isSafeExpression(node.values);
  }

  return false;
};

/**
 * Parses one inherited WHERE fragment. Extra commands (a pipe inside the
 * fragment) or a parse error mean we cannot classify the text.
 */
const isSafeWhereExpression = (expression: string): boolean => {
  const { root, errors } = Parser.parse(`FROM a | WHERE ${expression}`);
  if (errors.length > 0 || root.commands.length !== 2) {
    return false;
  }

  const [fromCommand, whereCommand] = root.commands;
  if (fromCommand?.name !== 'from' || whereCommand?.name !== 'where') {
    return false;
  }

  return isSafeExpression(whereCommand.args);
};

/**
 * Returns true when a metric chart should prepend `SET unmapped_fields = "NULLIFY"`.
 */
export const needsUnmappedFieldsNullify = ({
  whereStatements = [],
  splitAccessors = [],
}: {
  whereStatements?: readonly string[];
  splitAccessors?: readonly string[];
}): boolean => {
  if (splitAccessors.some((field) => !isAlwaysMappedField(field))) {
    return true;
  }

  return whereStatements.some((statement) => {
    const trimmed = statement.trim();
    return trimmed.length > 0 && !isSafeWhereExpression(trimmed);
  });
};
