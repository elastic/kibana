/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { isOptionNode, isParamLiteral } from '@elastic/esql';
import type { ESQLAstAllCommands, ESQLAstFillNullCommand } from '@elastic/esql/types';
import { ControlTriggerSource, ESQLVariableType } from '@kbn/esql-types';
import {
  getControlSuggestionIfSupported,
  withAutoSuggest,
} from '../../definitions/utils/autocomplete/helpers';
import { getColumnExists } from '../../definitions/utils/columns';
import { buildConstantsDefinitions } from '../../definitions/utils/literals';
import {
  allStarConstant,
  buildAddValuePlaceholder,
  commaCompleteItem,
  newLineAndPipeCompleteItems,
  onCompleteItem,
} from '../complete_items';
import type { ICommandCallbacks, ICommandContext, ISuggestionItem } from '../types';

export const autocomplete = async (
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition: number = query.length
): Promise<ISuggestionItem[]> => {
  const { value, fields } = command as ESQLAstFillNullCommand;
  const onOption = command.args.find((arg) => isOptionNode(arg) && arg.name === 'on');
  const innerText = query.slice(0, cursorPosition);

  // Check the source too: parser recovery can synthesize an ON option while it is being typed.
  if (
    onOption &&
    !Array.isArray(onOption) &&
    query.slice(onOption.location.min, onOption.location.min + 2).toLowerCase() === 'on' &&
    cursorPosition > onOption.location.min + 2
  ) {
    const lastField = fields.at(-1);
    const afterField =
      lastField &&
      !lastField.incomplete &&
      cursorPosition > lastField.location.max &&
      !innerText.trimEnd().endsWith(',');
    const separators = [
      ...newLineAndPipeCompleteItems,
      withAutoSuggest({ ...commaCompleteItem, text: ', ' }),
    ];

    if (afterField && /\s$/.test(innerText)) {
      return separators;
    }

    const ignored = fields
      .filter((field) => field.name && (field !== lastField || innerText.trimEnd().endsWith(',')))
      .map(({ name }) => name);
    const suggestions = [
      withAutoSuggest(allStarConstant),
      ...((await callbacks?.getByType?.('any', ignored)) ?? []).map((suggestion) =>
        withAutoSuggest(suggestion)
      ),
    ];

    if (
      afterField &&
      (isParamLiteral(lastField) || (context && getColumnExists(lastField, context)))
    ) {
      suggestions.push(
        ...separators.map((suggestion) => ({
          ...suggestion,
          text: suggestion.text === '| ' ? ' | ' : suggestion.text,
          preserveTypedPrefix: true,
        }))
      );
    }

    return suggestions;
  }

  if (value && !value.incomplete && cursorPosition > value.location.min + value.text.length) {
    return [onCompleteItem];
  }

  return [
    ...buildConstantsDefinitions(['DEFAULT', 'NULL', 'true', 'false'], '', {
      advanceCursorAndOpenSuggestions: true,
    }),
    buildAddValuePlaceholder('value'),
    buildAddValuePlaceholder('number'),
    ...getControlSuggestionIfSupported(
      Boolean(context?.supportsControls),
      ESQLVariableType.VALUES,
      ControlTriggerSource.SMART_SUGGESTION,
      context?.variables
    ),
  ];
};
