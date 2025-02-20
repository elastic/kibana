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
import { ENRICH_MODES } from '../../../definitions/settings';
import { SuggestionRawDefinition } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';

export enum Position {
  MODE = 'mode',
  POLICY = 'policy',
  AFTER_POLICY = 'after_policy',
  ON = 'on',
  AFTER_ON = 'after_on',
  MATCH_FIELD = 'match_field',
  AFTER_MATCH_FIELD = 'after_match_field',
  WITH = 'with',
  AFTER_WITH = 'after_with',
  NEW_NAME = 'new_name',
  AFTER_NEW_NAME = 'after_new_name',
  FIELD = 'field',
  AFTER_FIELD = 'after_field',
}

export const getPosition = (
  innerText: string,
  command: ESQLCommand<'enrich'>
): Position | undefined => {
  if (command.args.length < 2) {
    if (innerText.match(/\s+$/)) {
      return Position.AFTER_POLICY;
    }
    if (innerText.match(/_[^:\s]*$/)) {
      return Position.MODE;
    }
    return Position.POLICY;
  }

  if (command.args.length === 1) {
    return Position.AFTER_POLICY;
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
