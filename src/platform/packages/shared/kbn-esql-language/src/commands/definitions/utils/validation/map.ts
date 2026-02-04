/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage, ESQLSingleAstItem } from '../../../../types';
import type { SupportedDataType } from '../../..';
import { getExpressionType } from '../expressions';
import { getMessageFromId } from '../errors';
import { isMap } from '../../../../ast/is';
import { parseMapParams } from '../maps';

// the setting 'approximation' uses 'map_param' as a type,
// whereas the expression type in the AST is 'function_named_parameters'.
export const TypeMap: Record<SupportedDataType, string> = {
  function_named_parameters: 'map_param',
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
      const { type, rawType } = mapParamsDefinition[paramKey];
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
    }
  }
  return null;
}
