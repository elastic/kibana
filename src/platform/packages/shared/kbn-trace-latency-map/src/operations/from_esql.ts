/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LatencyMapOperation } from './operation_bands';
import { operationToEsqlCondition } from './to_esql';

/**
 * The exact shape `operationToEsqlCondition` writes: the service, then the operation name
 * in each of its families. The literals are ES|QL strings, so a quote inside a name is
 * escaped.
 */
const OPERATION_CONDITION_PATTERN =
  /^service\.name == "((?:[^"\\]|\\.)*)" AND \(transaction\.name == "((?:[^"\\]|\\.)*)" OR span\.name == "((?:[^"\\]|\\.)*)" OR name == "((?:[^"\\]|\\.)*)"\)$/;

const unquote = (text: string) => text.replace(/\\(.)/g, '$1');

/**
 * The operation of a condition `operationToEsqlCondition` wrote, for hosts that keep the
 * focused operation in a query and restore it from there (a reload, a shared URL).
 *
 * Only a condition that package function wrote parses: the shape must match exactly, the
 * three name literals must agree, and writing the result again must give the same text, so
 * a hand-edited clause or any other filter returns `undefined` and stays an ordinary filter
 * of the host's query.
 */
export function parseOperationCondition(condition: string): LatencyMapOperation | undefined {
  const match = condition.match(OPERATION_CONDITION_PATTERN);
  if (!match) return undefined;
  const [, service, transactionName, spanName, otelName] = match;
  if (transactionName !== spanName || spanName !== otelName) return undefined;
  const operation = { service: unquote(service), name: unquote(transactionName) };
  // The round trip catches stray escapes the pattern tolerates.
  return operationToEsqlCondition(operation) === condition ? operation : undefined;
}

/** Whether a clause is an operation condition this package wrote. */
export function isOperationCondition(condition: string): boolean {
  return parseOperationCondition(condition) !== undefined;
}
