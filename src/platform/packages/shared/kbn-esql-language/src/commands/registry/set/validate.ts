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
import { TypeMap, validateMap } from '../../definitions/utils/validation/map';

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
      const paramKey =
        'valueUnquoted' in settingValue ? settingValue.valueUnquoted : settingValue.text;

      return getMessageFromId({
        messageId: 'invalidSettingValue',
        values: { value: paramKey, setting: setting.name },
        locations: settingValue.location,
      });
    }

    // If the setting value is a map, validate its parameters
    return validateMap(settingValue, setting.mapParams || '');
  }
  return null;
}
