/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getExpressionType, getMessageFromId } from '../../definitions/utils';
import { settings } from '../../definitions/generated/settings';
import { isBinaryExpression, isIdentifier, isLiteral, isMap } from '../../../ast/is';
import type {
  ESQLAstAllCommands,
  ESQLCommand,
  ESQLIdentifier,
  ESQLMessage,
  ESQLSingleAstItem,
} from '../../../types';
import type { SupportedDataType } from '../..';
import { MAP_PARAMS_REGEX } from '../../definitions/utils/autocomplete/expressions/signature_analyzer';

export const validate = (command: ESQLAstAllCommands, commands: ESQLCommand[]): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const settingNameIdentifier = getSettingNameIdentifier(command);

  if (!settingNameIdentifier) {
    return [];
  }

  // Find the setting definition
  const setting = settings.find((s) => s.name === settingNameIdentifier.text);

  // Check if setting exists
  if (!setting) {
    messages.push(
      getMessageFromId({
        messageId: 'unknownSetting',
        values: { name: settingNameIdentifier.text },
        locations: settingNameIdentifier.location,
      })
    );
    return messages;
  }

  // If the setting definition is complete, validate the values and the types
  if (!settingNameIdentifier.incomplete) {
    const validationError = validateSettingValues(command, setting);
    if (validationError) {
      messages.push(validationError);
    }
  }

  return messages;
};

function getSettingNameIdentifier(command: ESQLAstAllCommands): ESQLIdentifier | null {
  const settingArg = command.args[0];
  if (!isBinaryExpression(settingArg)) {
    return null;
  }
  const settingName = settingArg.args[0];
  if (!isIdentifier(settingName)) {
    return null;
  }
  return settingName;
}

function getSettingValue(command: ESQLAstAllCommands): ESQLSingleAstItem | null {
  const settingArg = command.args[0];
  if (!isBinaryExpression(settingArg)) {
    return null;
  }
  const settingValue = settingArg.args[1];
  if (isLiteral(settingValue) || isMap(settingValue)) {
    return settingValue;
  }
  return null;
}

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
const TypeMap: Record<SupportedDataType, string> = {
  function_named_parameters: 'map_param',
};

function validateSettingValues(
  command: ESQLAstAllCommands,
  setting: { name: string; type: SupportedDataType[]; mapParams?: string }
): ESQLMessage | null {
  const settingValue = getSettingValue(command);
  if (settingValue) {
    const expectedTypes = setting.type;
    const settingValueType = getExpressionType(settingValue);
    const valueType = TypeMap[settingValueType] || settingValueType;

    // validate literal values types
    if (!expectedTypes.includes(valueType)) {
      return getMessageFromId({
        messageId: 'invalidSettingValueType',
        values: { value: settingValue.text, setting: setting.name },
        locations: settingValue.location,
      });
    }

    // If the setting value is a map, validate its parameters
    if (valueType === 'map_param' && isMap(settingValue) && setting.mapParams) {
      const mapParamsDefinition = getValuesTypeFromMapParamDefinition(setting.mapParams);
      const mapParamsEntries = settingValue.entries;

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
  }
  return null;
}
