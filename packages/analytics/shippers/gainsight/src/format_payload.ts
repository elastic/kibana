/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

const GAINSIGHT_RESERVED_PROPERTIES = [
  'uid',
  'displayName',
  'email',
  'acctId',
  'website',
  'pageName',
];

export function formatPayload(context: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context)
      // Discard any undefined values
      .map<[string, unknown]>(([key, value]) => {
        return Array.isArray(value)
          ? [key, value.filter((v) => typeof v !== 'undefined')]
          : [key, value];
      })
      .filter(
        ([, value]) => typeof value !== 'undefined' && (!Array.isArray(value) || value.length > 0)
      )
      // Transform key names according to the gainsight needs
      .map(([key, value]) => {
        if (GAINSIGHT_RESERVED_PROPERTIES.includes(key)) {
          return [key, value];
        }
        if (isRecord(value)) {
          return [key, formatPayload(value)];
        }
        const valueType = getGainsightType(value);
        const formattedKey = valueType ? `${key}_${valueType}` : key;
        return [formattedKey, value];
      })
  );
}

function getGainsightType(value: unknown) {
  // For arrays, make the decision based on the first element
  const isArray = Array.isArray(value);
  const v = isArray ? value[0] : value;
  let type: string;
  switch (typeof v) {
    case 'string':
      type = moment(v, moment.ISO_8601, true).isValid() ? 'date' : 'str';
      break;
    case 'number':
      type = Number.isInteger(v) ? 'int' : 'real';
      break;
    case 'boolean':
      type = 'bool';
      break;
    case 'object':
      if (isDate(v)) {
        type = 'date';
        break;
      }
    default:
      throw new Error(`Unsupported type: ${typeof v}`);
  }

  // convert to plural form for arrays
  return isArray ? `${type}s` : type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isDate(value);
}

function isDate(value: unknown): value is Date {
  return value instanceof Date;
}
