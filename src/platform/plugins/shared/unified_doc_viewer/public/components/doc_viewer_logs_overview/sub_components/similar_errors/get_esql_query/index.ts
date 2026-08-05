/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstExpression } from '@elastic/esql/types';
import { fieldConstants } from '@kbn/discover-utils';
import { esqlColumn } from '../../../../../utils/esql_column';
import {
  esqlAnd,
  esqlEquals,
  esqlFunction,
  esqlString,
} from '../../../../../utils/esql_expressions';

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
    esqlEquals(fieldConstants.SERVICE_NAME_FIELD, serviceName),
  ];

  if (culprit) {
    conditions.push(esqlEquals(fieldConstants.ERROR_CULPRIT_FIELD, culprit));
  }

  if (message?.value !== undefined && message?.fieldName) {
    const messageValue = String(message.value);
    conditions.push(
      needsNormalization(messageValue)
        ? esqlFunction('MATCH_PHRASE', [esqlColumn(message.fieldName), esqlString(messageValue)])
        : esqlEquals(message.fieldName, messageValue)
    );
  }

  if (type?.value !== undefined && type?.fieldName) {
    if (Array.isArray(type.value)) {
      conditions.push(
        ...type.value.map((val) =>
          esqlFunction('MATCH', [esqlColumn(type.fieldName), esqlString(String(val))])
        )
      );
    } else {
      conditions.push(esqlEquals(type.fieldName, type.value));
    }
  }

  return esqlAnd(conditions);
}
