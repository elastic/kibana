/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getMessageFromId } from '../../../definitions/utils';
import { settings } from '../../../definitions/generated/settings';
import { isBinaryExpression, isIdentifier } from '../../../ast/is';
import type { ESQLAstAllCommands, ESQLCommand, ESQLIdentifier, ESQLMessage } from '../../../types';

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
