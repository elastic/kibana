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
import { isSingleItem } from '../../../..';
import { ENRICH_MODES } from '../../../definitions/settings';
import { SuggestionRawDefinition } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, getSafeInsertText } from '../../factories';

export enum Position {
  MODE = 'mode',
  POLICY = 'policy',
  AFTER_POLICY = 'after_policy',
  MATCH_FIELD = 'match_field',
  AFTER_ON_CLAUSE = 'after_on_clause',
  WITH_NEW_CLAUSE = 'with_new_clause',
  WITH_AFTER_FIRST_WORD = 'with_after_first_word',
  WITH_AFTER_ASSIGNMENT = 'with_after_assignment',
  WITH_AFTER_COMPLETE_CLAUSE = 'with_after_complete_clause',
}

export const getPosition = (
  innerText: string,
  command: ESQLCommand<'enrich'>
): Position | undefined => {
  if (command.args.length < 2) {
    if (innerText.match(/_[^:\s]*$/)) {
      return Position.MODE;
    }
    if (innerText.match(/(:|ENRICH\s+)\S*$/i)) {
      return Position.POLICY;
    }
    if (innerText.match(/:\s+$/)) {
      return undefined;
    }
    if (innerText.match(/\s+\S*$/)) {
      return Position.AFTER_POLICY;
    }
  }

  const lastArg = command.args[command.args.length - 1];
  if (isSingleItem(lastArg) && lastArg.name === 'on') {
    if (innerText.match(/on\s+\S*$/i)) {
      return Position.MATCH_FIELD;
    }
    if (innerText.match(/on\s+\S+\s+$/i)) {
      return Position.AFTER_ON_CLAUSE;
    }
  }

  if (isSingleItem(lastArg) && lastArg.name === 'with') {
    if (innerText.match(/[,|with]\s+\S*$/i)) {
      return Position.WITH_NEW_CLAUSE;
    }
    if (innerText.match(/[,|with]\s+\S+\s*=\s*\S+\s+$/i)) {
      return Position.WITH_AFTER_COMPLETE_CLAUSE;
    }
    if (innerText.match(/[,|with]\s+\S+\s+$/i)) {
      return Position.WITH_AFTER_FIRST_WORD;
    }
    if (innerText.match(/=\s+[^,\s]*$/i)) {
      return Position.WITH_AFTER_ASSIGNMENT;
    }
  }
};

export const noPoliciesAvailableSuggestion: SuggestionRawDefinition = {
  label: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.noPoliciesLabel', {
    defaultMessage: 'No available policy',
  }),
  text: '',
  kind: 'Issue',
  detail: i18n.translate(
    'kbn-esql-validation-autocomplete.esql.autocomplete.noPoliciesLabelsFound',
    {
      defaultMessage: 'Click to create',
    }
  ),
  sortText: 'D',
  command: {
    id: 'esql.policies.create',
    title: i18n.translate('kbn-esql-validation-autocomplete.esql.autocomplete.createNewPolicy', {
      defaultMessage: 'Click to create',
    }),
  },
};

export const modeSuggestions: SuggestionRawDefinition[] = ENRICH_MODES.values.map(
  ({ name, description }) => ({
    label: `${ENRICH_MODES.prefix || ''}${name}`,
    text: `${ENRICH_MODES.prefix || ''}${name}:$0`,
    asSnippet: true,
    kind: 'Reference',
    detail: `${ENRICH_MODES.description} - ${description}`,
    sortText: 'D',
    command: TRIGGER_SUGGESTION_COMMAND,
  })
);

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

export const withSuggestion: SuggestionRawDefinition = {
  label: 'WITH',
  text: 'WITH ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.withDoc', {
    defaultMessage: 'With',
  }),
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const buildMatchingFieldsDefinition = (
  matchingField: string,
  fields: string[]
): SuggestionRawDefinition[] =>
  fields.map((label) => ({
    label,
    text: getSafeInsertText(label) + ' ',
    kind: 'Variable',
    detail: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.autocomplete.matchingFieldDefinition',
      {
        defaultMessage: `Use to match on {matchingField} on the policy`,
        values: {
          matchingField,
        },
      }
    ),
    sortText: 'D',
    command: TRIGGER_SUGGESTION_COMMAND,
  }));
