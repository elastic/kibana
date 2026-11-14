/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPERATION_NAME_FIELDS, SERVICE_NAME_FIELD } from '../query/fields';
import type { LatencyMapOperation } from './operation_bands';

/** An ES|QL string literal: backslashes first, so an escaped quote is not escaped again. */
export const quoteEsqlString = (value: string) =>
  `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

/**
 * The ES|QL condition of one operation: its service, and its name in whichever family
 * names the span. Over raw fields, so Elasticsearch filters it with its index, and so a
 * host can append it to any query over trace data.
 */
export function operationToEsqlCondition({ service, name }: LatencyMapOperation): string {
  const names = OPERATION_NAME_FIELDS.map((field) => `${field} == ${quoteEsqlString(name)}`).join(
    ' OR '
  );
  return `${SERVICE_NAME_FIELD} == ${quoteEsqlString(service)} AND (${names})`;
}
