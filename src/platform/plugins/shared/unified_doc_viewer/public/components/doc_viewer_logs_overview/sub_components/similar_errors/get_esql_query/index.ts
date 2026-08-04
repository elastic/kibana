/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { fieldConstants } from '@kbn/discover-utils';

interface ErrorField {
  fieldName: string;
  value: string | string[];
}

function needsNormalization(message: string): boolean {
  return /\n|\t|\r/.test(message);
}

export function getEsqlQuery({
  serviceName,
  culprit,
  message,
  type,
}: {
  serviceName?: string;
  culprit?: string;
  message?: ErrorField;
  type?: ErrorField;
}): ESQLAstExpression | undefined {
  if (!serviceName) {
    return undefined;
  }

  const conditions: ESQLAstExpression[] = [
    esql.exp`${esql.col(fieldConstants.SERVICE_NAME_FIELD)} == ${esql.str(serviceName)}`,
  ];

  if (culprit) {
    conditions.push(
      esql.exp`${esql.col(fieldConstants.ERROR_CULPRIT_FIELD)} == ${esql.str(culprit)}`
    );
  }

  if (message?.value !== undefined && message?.fieldName) {
    const messageValue = String(message.value);
    const messageColumn = esql.col(message.fieldName);
    conditions.push(
      needsNormalization(messageValue)
        ? esql.exp`MATCH_PHRASE(${messageColumn}, ${esql.str(messageValue)})`
        : esql.exp`${messageColumn} == ${esql.str(messageValue)}`
    );
  }

  if (type?.value !== undefined && type?.fieldName) {
    const typeColumn = esql.col(type.fieldName);
    if (Array.isArray(type.value)) {
      type.value.forEach((val) => {
        conditions.push(esql.exp`MATCH(${typeColumn}, ${esql.str(String(val))})`);
      });
    } else {
      conditions.push(esql.exp`${typeColumn} == ${esql.str(type.value)}`);
    }
  }

  return conditions.reduce((left, right) => Builder.expression.func.binary('and', [left, right]));
}
