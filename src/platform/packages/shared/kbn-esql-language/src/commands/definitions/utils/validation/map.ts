/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMap, ESQLSingleAstItem } from '@elastic/esql/types';
import { isList, isMap, isStringLiteral } from '@elastic/esql';
import type { ESQLMessage, SupportedDataType } from '../../..';
import { UnmappedFieldsStrategy, type ESQLColumnData } from '../../../registry/types';
import { getExpressionType } from '../expressions';
import { getMessageFromId } from '../errors';
import { getMapEntryByStringKeyFromAst, parseMapParams } from '../maps';

// the setting 'approximation' uses 'map_param' as a type,
// whereas the expression type in the AST is 'function_named_parameters'.
export const TypeMap: Record<SupportedDataType, string> = {
  function_named_parameters: 'map_param',
};

/**
 * Returns the first literal in `value` that is not in `allowed`, or undefined when all are.
 * A parameter may hold a single literal or a list of them (e.g. USER_AGENT's `properties`).
 *
 * Matching is case-insensitive: Elasticsearch is case-insensitive for most enumerated options,
 * so comparing loosely avoids flagging queries the server would accept.
 */
const findValueOutsideAllowedSet = (
  value: ESQLSingleAstItem,
  allowed: string[]
): string | undefined => {
  const items = isList(value) ? value.values : [value];
  const allowedLowercase = allowed.map((entry) => entry.toLowerCase());

  for (const item of items) {
    if (!isStringLiteral(item)) {
      continue;
    }

    if (!allowedLowercase.includes(item.valueUnquoted.toLowerCase())) {
      return item.valueUnquoted;
    }
  }

  return undefined;
};

export function validateMap(
  mapValue: ESQLSingleAstItem,
  mapDefinition: string
): ESQLMessage | null {
  const expressionType = getExpressionType(mapValue);
  const valueType = TypeMap[expressionType] || expressionType;

  if (valueType === 'map_param' && isMap(mapValue) && mapDefinition) {
    const mapParamsDefinition = parseMapParams(mapDefinition);
    const mapParamsEntries = mapValue.entries;

    for (const param of mapParamsEntries) {
      const paramKey = 'valueUnquoted' in param.key ? param.key.valueUnquoted : param.key.text;
      if (!mapParamsDefinition[paramKey]) {
        return getMessageFromId({
          messageId: 'unknownMapParameterName',
          values: { paramName: paramKey },
          locations: param.key.location,
        });
      }

      const paramValueType = getExpressionType(param.value);
      const { type, rawType, values } = mapParamsDefinition[paramKey];
      if (param.incomplete === false && !(rawType === paramValueType)) {
        return getMessageFromId({
          messageId: 'invalidMapParameterValueType',
          values: {
            paramName: paramKey,
            expectedType: rawType || type,
            actualType: paramValueType,
          },
          locations: param.value.location,
        });
      }

      if (param.incomplete === false && values.length > 0) {
        const invalidValue = findValueOutsideAllowedSet(param.value, values);

        if (invalidValue) {
          return getMessageFromId({
            messageId: 'invalidMapParameterValue',
            values: {
              paramName: paramKey,
              value: invalidValue,
              allowedValues: values.join(', '),
            },
            locations: param.value.location,
          });
        }
      }
    }
  }
  return null;
}

/**
 * Enforces list shape for map parameters whose item type is validated by validateMap.
 */
export const validateMapListParameter = (
  mapValue: ESQLMap,
  paramName: string,
  columns?: Map<string, ESQLColumnData>,
  unmappedFieldsStrategy: UnmappedFieldsStrategy = UnmappedFieldsStrategy.DEFAULT
): ESQLMessage | null => {
  const entry = getMapEntryByStringKeyFromAst(mapValue, paramName);

  if (!entry || entry.incomplete || isList(entry.value)) {
    return null;
  }

  return getMessageFromId({
    messageId: 'invalidMapParameterValueType',
    values: {
      paramName,
      expectedType: 'list',
      actualType: getExpressionType(entry.value, columns, unmappedFieldsStrategy),
    },
    locations: entry.value.location,
  });
};
