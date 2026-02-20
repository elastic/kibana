/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import type { ESQLAstAllCommands } from '../../../types';
import type { ESQLPolicy, ISuggestionItem } from '../types';
import { getSafeInsertText } from '../../definitions/utils/autocomplete/helpers';
import { SuggestionCategory } from '../../../language/autocomplete/utils/sorting/types';

export const ENRICH_MODES = [
  {
    name: 'any',
    description: i18n.translate('kbn-esql-language.esql.definitions.ccqAnyDoc', {
      defaultMessage: 'Enrich takes place on any cluster',
    }),
  },
  {
    name: 'coordinator',
    description: i18n.translate('kbn-esql-language.esql.definitions.ccqCoordinatorDoc', {
      defaultMessage: 'Enrich takes place on the coordinating cluster receiving an ES|QL',
    }),
  },
  {
    name: 'remote',
    description: i18n.translate('kbn-esql-language.esql.definitions.ccqRemoteDoc', {
      defaultMessage: 'Enrich takes place on the cluster hosting the target index.',
    }),
  },
];

export const buildPoliciesDefinitions = (
  policies: Array<{ name: string; sourceIndices: string[] }>
): ISuggestionItem[] =>
  policies.map(({ name: label, sourceIndices }) =>
    withAutoSuggest({
      label,
      text: getSafeInsertText(label, { dashSupported: true }) + ' ',
      kind: 'Class',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.policyDefinition', {
        defaultMessage: `Policy defined on {count, plural, one {index} other {indices}}: {indices}`,
        values: {
          count: sourceIndices.length,
          indices: sourceIndices.join(', '),
        },
      }),
      sortText: 'D',
    })
  );

export const getPolicyMetadata = (policies: Map<string, ESQLPolicy>, policyName: string) => {
  return policies.get(policyName);
};

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
  command: ESQLAstAllCommands
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
  if (!Array.isArray(lastArg) && lastArg.name === 'on') {
    if (innerText.match(/on\s+\S*$/i)) {
      return Position.MATCH_FIELD;
    }
    if (innerText.match(/on\s+\S+\s+$/i)) {
      return Position.AFTER_ON_CLAUSE;
    }
  }

  if (!Array.isArray(lastArg) && lastArg.name === 'with') {
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

export const noPoliciesAvailableSuggestion: ISuggestionItem = {
  label: i18n.translate('kbn-esql-language.esql.autocomplete.noPoliciesLabel', {
    defaultMessage: 'No available policy',
  }),
  text: '',
  kind: 'Issue',
  detail: i18n.translate('kbn-esql-language.esql.autocomplete.noPoliciesLabelsFound', {
    defaultMessage: 'Click to create',
  }),
  sortText: 'D',
  category: SuggestionCategory.CUSTOM_ACTION,
  command: {
    id: 'esql.policies.create',
    title: i18n.translate('kbn-esql-language.esql.autocomplete.createNewPolicy', {
      defaultMessage: 'Click to create',
    }),
  },
};

export const modeDescription = i18n.translate('kbn-esql-language.esql.definitions.ccqMode', {
  defaultMessage: 'Cross-cluster query mode',
});

export const modeSuggestions: ISuggestionItem[] = ENRICH_MODES?.map(({ name, description }) =>
  withAutoSuggest({
    label: `_${name}`,
    text: `_${name}:$0`,
    asSnippet: true,
    kind: 'Reference',
    detail: i18n.translate('kbn-esql-language.esql.definitions.ccqModeDoc', {
      defaultMessage: 'Cross-cluster query mode - ${description}',
      values: {
        description,
      },
    }),
    sortText: 'D',
  })
);

export const onSuggestion: ISuggestionItem = withAutoSuggest({
  label: 'ON',
  text: 'ON ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-language.esql.definitions.onDoc', {
    defaultMessage: 'On',
  }),
  sortText: '1',
});

export const withSuggestion: ISuggestionItem = withAutoSuggest({
  label: 'WITH',
  text: 'WITH ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-language.esql.definitions.withDoc', {
    defaultMessage: 'With',
  }),
  sortText: '1',
});

export const buildMatchingFieldsDefinition = (
  matchingField: string,
  fields: string[]
): ISuggestionItem[] =>
  fields.map((label) =>
    withAutoSuggest({
      label,
      text: getSafeInsertText(label) + ' ',
      kind: 'Variable',
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.matchingFieldDefinition', {
        defaultMessage: `Use to match on {matchingField} on the policy`,
        values: {
          matchingField,
        },
      }),
      sortText: 'D',
      category: SuggestionCategory.FIELD,
    })
  );
