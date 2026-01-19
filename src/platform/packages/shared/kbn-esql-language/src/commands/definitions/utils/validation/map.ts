/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage, ESQLSingleAstItem } from '@kbn/esql-language/src/types';
import type { SupportedDataType } from '../../..';
import { MAP_PARAMS_REGEX } from '../autocomplete/expressions/signature_analyzer';
import { getExpressionType } from '../expressions';
import { getMessageFromId } from '../errors';
import { isMap } from '../../../../ast/is';

function getValuesTypeFromMapParamDefinition(mapParamsStr: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const match of mapParamsStr.matchAll(MAP_PARAMS_REGEX)) {
    const paramName = match[1];
    const rawType = match[4] ?? 'keyword';
    const typesFromDefinition = rawType.split(',').map((type) => type.trim() ?? 'keyword');
    result[paramName] = typesFromDefinition;
  }

  return result;
}

// the setting 'approximate' uses 'map_param' as a type,
// whereas the expression type in the AST is 'function_named_parameters'.
export const TypeMap: Record<SupportedDataType, string> = {
  function_named_parameters: 'map_param',
};

export function validateMap(
  mapValue: ESQLSingleAstItem,
  mapDefinition: string
): ESQLMessage | null {
  const settingValueType = getExpressionType(mapValue);
  const valueType = TypeMap[settingValueType] || settingValueType;

  if (valueType === 'map_param' && isMap(mapValue) && mapDefinition) {
    const mapParamsDefinition = getValuesTypeFromMapParamDefinition(mapDefinition);
    const mapParamsEntries = mapValue.entries;

    for (const param of mapParamsEntries) {
      const paramKey = 'valueUnquoted' in param.key ? param.key.valueUnquoted : param.key.text;
      if (!mapParamsDefinition[paramKey]) {
        return getMessageFromId({
          messageId: 'unknownMapParameterName',
          values: { paramName: paramKey, map: JSON.stringify(mapParamsDefinition) },
          locations: param.key.location,
        });
      }

      const paramValueType = getExpressionType(param.value);
      if (
        mapParamsDefinition[paramKey] &&
        param.incomplete === false &&
        !mapParamsDefinition[paramKey].includes(paramValueType)
      ) {
        return getMessageFromId({
          messageId: 'invalidMapParameterValueType',
          values: {
            paramName: paramKey,
            expectedTypes: mapParamsDefinition[paramKey].join(', '),
            actualType: paramValueType,
          },
          locations: param.value.location,
        });
      }
    }
  }
  return null;
}
