/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLCommand } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { ESQL_NUMBER_TYPES } from '../../../shared/esql_types';
import { findFinalWord, isSingleItem } from '../../../shared/helpers';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { pipeCompleteItem } from '../../complete_items';
import { buildVariablesDefinitions, TRIGGER_SUGGESTION_COMMAND } from '../../factories';

export enum Position {
  VALUE = 'value',
  AFTER_VALUE = 'after_value',
  ON_COLUMN = 'on_column',
  AFTER_ON_CLAUSE = 'after_on_clause',
  AS_TYPE_COLUMN = 'as_type_clause',
  AS_P_VALUE_COLUMN = 'as_p_value_column',
  AFTER_AS_CLAUSE = 'after_as_clause',
}

export const getPosition = (
  innerText: string,
  command: ESQLCommand<'change_point'>
): Position | undefined => {
  if (command.args.length < 2) {
    if (innerText.match(/CHANGE_POINT\s+\S*$/i)) {
      return Position.VALUE;
    }

    if (innerText.match(/CHANGE_POINT\s+\S+\s*\S*$/i)) {
      return Position.AFTER_VALUE;
    }
  }

  const lastArg = command.args[command.args.length - 1];

  if (innerText.match(/on\s+\S*$/i)) {
    return Position.ON_COLUMN;
  }

  if (isSingleItem(lastArg) && lastArg.name === 'on') {
    if (innerText.match(/on\s+\S+\s+$/i)) {
      return Position.AFTER_ON_CLAUSE;
    }
  }

  if (innerText.match(/as\s+$/i)) {
    return Position.AS_TYPE_COLUMN;
  }

  if (isSingleItem(lastArg) && lastArg.name === 'as') {
    if (innerText.match(/as\s+\S+,\s*\S*$/i)) {
      return Position.AS_P_VALUE_COLUMN;
    }

    if (innerText.match(/as\s+\S+,\s*\S+\s+$/i)) {
      return Position.AFTER_AS_CLAUSE;
    }
  }
};

export const onSuggestion: SuggestionRawDefinition = {
  label: 'ON',
  text: 'ON ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.onDoc', {
    defaultMessage: 'On',
  }),
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const asSuggestion: SuggestionRawDefinition = {
  label: 'AS',
  text: 'AS ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.asDoc', {
    defaultMessage: 'As',
  }),
  sortText: '2',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export async function suggest({
  innerText,
  command,
  getColumnsByType,
}: CommandSuggestParams<'change_point'>): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  switch (pos) {
    case Position.VALUE:
      const numericFields = await getColumnsByType(ESQL_NUMBER_TYPES, [], {
        advanceCursor: true,
        openSuggestions: true,
      });
      const lastWord = findFinalWord(innerText);
      if (lastWord !== '') {
        numericFields.forEach((fieldSuggestion) => {
          fieldSuggestion.rangeToReplace = {
            start: innerText.length - lastWord.length + 1,
            end: innerText.length + 1,
          };
        });
      }
      return numericFields;
    case Position.AFTER_VALUE: {
      return [onSuggestion, asSuggestion, pipeCompleteItem];
    }
    case Position.ON_COLUMN: {
      const onFields = await getColumnsByType('any', [], {
        advanceCursor: true,
        openSuggestions: true,
      });
      return onFields;
    }
    case Position.AFTER_ON_CLAUSE:
      return [asSuggestion, pipeCompleteItem];
    case Position.AS_TYPE_COLUMN: {
      // add comma and space
      return buildVariablesDefinitions(['changePointType']).map((v) => ({
        ...v,
        text: v.text + ', ',
        command: TRIGGER_SUGGESTION_COMMAND,
      }));
    }
    case Position.AS_P_VALUE_COLUMN: {
      return buildVariablesDefinitions(['pValue']).map((v) => ({
        ...v,
        command: TRIGGER_SUGGESTION_COMMAND,
      }));
    }
    case Position.AFTER_AS_CLAUSE: {
      return [pipeCompleteItem];
    }
    default:
      return [];
  }
}
