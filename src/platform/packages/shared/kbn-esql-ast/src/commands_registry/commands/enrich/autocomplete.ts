/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLCommand, ESQLSource } from '../../../types';
import {
  pipeCompleteItem,
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
} from '../../utils/complete_items';
import { findFinalWord, findPreviousWord } from '../../../definitions/utils/autocomplete';
import { unescapeColumnName } from '../../../definitions/utils/shared';
import {
  type ISuggestionItem,
  type ICommandContext,
  Location,
  ESQLPolicy,
  ICommandCallbacks,
} from '../../types';
import {
  Position,
  buildMatchingFieldsDefinition,
  getPosition,
  modeSuggestions,
  noPoliciesAvailableSuggestion,
  onSuggestion,
  withSuggestion,
  getPolicyMetadata,
  buildPoliciesDefinitions,
} from './util';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';
import { getOperatorSuggestions } from '../../../definitions/utils/operators';
import { buildFieldsDefinitions } from '../../../definitions/utils/functions';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  const pos = getPosition(query, command);
  const policies = context?.policies ?? new Map<string, ESQLPolicy>();
  const fieldsMap = context?.fields ?? new Map<string, string>();
  const allColumnNames = Array.from(fieldsMap.keys());
  const policyName = (
    command.args.find((arg) => !Array.isArray(arg) && arg.type === 'source') as
      | ESQLSource
      | undefined
  )?.name;

  const getFieldSuggestionsForWithClause = async () => {
    if (!policyName) {
      return [];
    }

    const policyMetadata = getPolicyMetadata(policies, policyName);
    if (!policyMetadata) {
      return [];
    }

    const fieldSuggestions = buildFieldsDefinitions(policyMetadata.enrichFields, false);

    const lastWord = findFinalWord(query);
    if (lastWord) {
      // ENRICH ... WITH a <suggest>
      const rangeToReplace = {
        start: query.length - lastWord.length + 1,
        end: query.length + 1,
      };
      fieldSuggestions.forEach((s) => {
        s.rangeToReplace = rangeToReplace;
      });
    }

    return fieldSuggestions;
  };

  switch (pos) {
    case Position.MODE:
      return modeSuggestions;

    case Position.POLICY: {
      const policiesSuggestions = buildPoliciesDefinitions(Array.from(policies.values()));
      const lastWord = findFinalWord(query);
      if (lastWord !== '') {
        policiesSuggestions.forEach((policySuggestion) => {
          policySuggestion.rangeToReplace = {
            start: query.length - lastWord.length + 1,
            end: query.length + 1,
          };
        });
      }
      return policiesSuggestions.length ? policiesSuggestions : [noPoliciesAvailableSuggestion];
    }

    case Position.AFTER_POLICY:
      return [onSuggestion, withSuggestion, pipeCompleteItem];

    case Position.MATCH_FIELD: {
      if (!policyName) {
        return [];
      }

      const policyMetadata = getPolicyMetadata(policies, policyName);
      if (!policyMetadata) {
        return [];
      }

      return buildMatchingFieldsDefinition(policyMetadata.matchField, allColumnNames);
    }

    case Position.AFTER_ON_CLAUSE:
      return [withSuggestion, pipeCompleteItem];

    case Position.WITH_NEW_CLAUSE: {
      if (!policyName) {
        return [];
      }

      const policyMetadata = getPolicyMetadata(policies, policyName);
      if (!policyMetadata) {
        return [];
      }

      const suggestions: ISuggestionItem[] = [];
      suggestions.push(
        getNewUserDefinedColumnSuggestion(
          callbacks?.getSuggestedUserDefinedColumnName?.(policyMetadata.enrichFields) || ''
        )
      );
      suggestions.push(...(await getFieldSuggestionsForWithClause()));
      return suggestions;
    }

    case Position.WITH_AFTER_FIRST_WORD: {
      if (!policyName) {
        return [];
      }
      const policyMetadata = getPolicyMetadata(policies, policyName);

      if (!policyMetadata) {
        return [];
      }

      const word = findPreviousWord(query);
      if (policyMetadata.enrichFields.includes(unescapeColumnName(word))) {
        // complete field name
        return [pipeCompleteItem, { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
      } else {
        // not recognized as a field name, assume new user-defined column name
        return getOperatorSuggestions({ location: Location.ENRICH });
      }
    }

    case Position.WITH_AFTER_ASSIGNMENT: {
      const suggestions: ISuggestionItem[] = [];
      suggestions.push(...(await getFieldSuggestionsForWithClause()));
      return suggestions;
    }

    case Position.WITH_AFTER_COMPLETE_CLAUSE: {
      return [pipeCompleteItem, { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
    }

    default:
      return [];
  }
}
