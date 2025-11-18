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
  value: string | undefined;
}

export function getEsqlQuery({
  serviceName,
  culprit,
  message,
  type,
}: {
  serviceName?: string;
  culprit?: ErrorField;
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

  if (culprit?.value !== undefined && culprit?.fieldName) {
    const paramName = 'culprit';
    conditions.push(`${culprit.fieldName} == ?${paramName}`);
    params[paramName] = culprit.value;
  }

  if (message?.value !== undefined && message?.fieldName) {
    const paramName = 'message';
    conditions.push(`${message.fieldName} == ?${paramName}`);
    params[paramName] = message.value;
  }

  if (type?.value !== undefined && type?.fieldName) {
    const paramName = 'type';
    conditions.push(`${type.fieldName} == ?${paramName}`);
    params[paramName] = type.value;
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return where(conditions.join(' AND '), params);
}
