/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldConstants } from '@kbn/discover-utils';
import { where } from '@kbn/esql-composer';

interface ErrorField {
  fieldName: string;
  value: string | string[];
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
}) {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (!serviceName) {
    return undefined;
  } else {
    const paramName = 'serviceName';
    conditions.push(`${fieldConstants.SERVICE_NAME_FIELD} == ?${paramName}`);
    params[paramName] = serviceName;
  }

  if (culprit) {
    const paramName = 'culprit';
    conditions.push(`${fieldConstants.ERROR_CULPRIT_FIELD} == ?${paramName}`);
    params[paramName] = culprit;
  }

  if (message?.value !== undefined && message?.fieldName) {
    const paramName = 'message';
    conditions.push(`${message.fieldName} == ?${paramName}`);
    params[paramName] = String(message.value);
  }

  if (type?.value !== undefined && type?.fieldName) {
    const typeFieldName = type.fieldName;
    if (Array.isArray(type.value)) {
      const matchConditions = type.value.map((val) => {
        const stringValue = String(val);
        return `MATCH(${typeFieldName}, "${stringValue}")`;
      });
      conditions.push(matchConditions.join(' AND '));
    } else {
      const paramName = 'type';
      conditions.push(`${typeFieldName} == ?${paramName}`);
      params[paramName] = type.value;
    }
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return where(conditions.join(' AND '), params);
}
