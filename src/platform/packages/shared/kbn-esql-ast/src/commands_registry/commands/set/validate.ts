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
import type { ESQLAstAllCommands, ESQLCommand, ESQLMessage } from '../../../types';
import type { ICommandContext } from '../../types';

const validSettingNames = settings.map((s) => s.name);

export const validate = (
  command: ESQLAstAllCommands,
  commands: ESQLCommand[],
  context?: ICommandContext
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const settingArg = command.args[0];

  if (isBinaryExpression(settingArg)) {
    const settingName = settingArg.args[0];

    if (isIdentifier(settingName) && !validSettingNames.includes(settingName.text)) {
      messages.push(
        getMessageFromId({
          messageId: 'unknownSetting',
          values: { name: settingName.text },
          locations: settingName.location,
        })
      );
    }
  }

  return messages;
};
