/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstHeaderCommand, ESQLAstSetHeaderCommand } from '../../../types';
import { isBinaryExpression, isIdentifier, isStringLiteral, withAutoSuggest } from '../../../..';
import { UnmappedFieldsTreatment, type ISuggestionItem } from '../../registry/types';
import { SuggestionCategory } from '../../../shared/sorting/types';
import { settings } from '../generated/settings';

export function getSettingsCompletionItems(isServerless?: boolean): ISuggestionItem[] {
  return (
    settings
      // Filter out serverless-only settings if not in serverless mode, if not flavour is provided don't return serverlessOnly settings.
      .filter((setting) => (isServerless ? setting.serverlessOnly : !setting.serverlessOnly))
      // Filter out settings we don't want as suggestions
      .filter((setting) => !setting.ignoreAsSuggestion)
      .map((setting) =>
        withAutoSuggest({
          label: setting.name,
          text: `${setting.name} = `,
          kind: 'Reference',
          detail: setting.description,
          sortText: '1',
          category: SuggestionCategory.VALUE,
        })
      )
  );
}

/**
 * Given a SET command, it returs the name and the value of the setting, or undefined if some is not present.
 */
export function getSettingData(settingCommand: ESQLAstSetHeaderCommand): {
  settingName?: string;
  settingValue?: string;
} {
  const settingArg = settingCommand.args[0];
  const leftSide = isBinaryExpression(settingArg) ? settingArg.args[0] : undefined;
  const rigthSide = isBinaryExpression(settingArg) ? settingArg.args[1] : undefined;

  const settingName = isIdentifier(leftSide) ? leftSide.text : undefined;
  const settingValue = isStringLiteral(rigthSide) ? rigthSide.valueUnquoted : undefined;

  return {
    settingName,
    settingValue,
  };
}

/**
 * Checks the headers commmands looking for an unmapped_fields setting and returns its treatment value.
 * Default is FAIL.
 */
export function getUnmappedFieldsTreatment(
  headers: ESQLAstHeaderCommand[] = []
): UnmappedFieldsTreatment {
  let unmappedFieldsTreatment: UnmappedFieldsTreatment = UnmappedFieldsTreatment.FAIL;

  headers.forEach((comand) => {
    if (comand.name.toUpperCase() === 'SET') {
      const { settingName, settingValue } = getSettingData(comand as ESQLAstSetHeaderCommand);
      if (settingName?.toUpperCase() === 'UNMAPPED_FIELDS') {
        switch (settingValue?.toUpperCase()) {
          case 'NULLIFY':
            unmappedFieldsTreatment = UnmappedFieldsTreatment.NULLIFY;
            break;
          case 'LOAD':
            unmappedFieldsTreatment = UnmappedFieldsTreatment.LOAD;
            break;
        }
      }
    }
  });
  return unmappedFieldsTreatment;
}
