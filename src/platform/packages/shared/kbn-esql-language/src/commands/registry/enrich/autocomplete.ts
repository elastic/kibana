/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { withAutoSuggest } from '../../definitions/utils/autocomplete/helpers';
import { findFinalWord, findPreviousWord } from '../../definitions/utils/autocomplete/helpers';
import { buildFieldsDefinitions } from '../../definitions/utils/functions';
import { getOperatorSuggestions } from '../../definitions/utils/operators';
import { unescapeColumnName } from '../../definitions/utils/shared';
import type { ESQLAstAllCommands, ESQLSource } from '../../../types';
import {
  commaCompleteItem,
  getNewUserDefinedColumnSuggestion,
  pipeCompleteItem,
} from '../complete_items';
import type { ESQLColumnData, ESQLPolicy, ICommandCallbacks } from '../types';
import { Location, type ICommandContext, type ISuggestionItem } from '../types';
import {
  Position,
  buildMatchingFieldsDefinition,
  buildPoliciesDefinitions,
  getPolicyMetadata,
  getPosition,
  modeSuggestions,
  noPoliciesAvailableSuggestion,
  onSuggestion,
  withSuggestion,
} from './util';

export async function autocomplete(
  query: string,
  command: ESQLAstAllCommands,
  callbacks?: ICommandCallbacks,
  context?: ICommandContext,
  cursorPosition?: number
): Promise<ISuggestionItem[]> {
  const innerText = query.substring(0, cursorPosition);
  const pos = getPosition(innerText, command);
  const policies = context?.policies ?? new Map<string, ESQLPolicy>();
  const columnMap = context?.columns ?? new Map<string, ESQLColumnData>();

  const fieldNames: string[] = [];
  for (const name of columnMap.keys()) {
    const col = columnMap.get(name);
    if (col && !col.userDefined) fieldNames.push(name);
  }

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

    const lastWord = findFinalWord(innerText);
    if (lastWord) {
      // ENRICH ... WITH a <suggest>
      const rangeToReplace = {
        start: innerText.length - lastWord.length + 1,
        end: innerText.length + 1,
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
      const lastWord = findFinalWord(innerText);
      if (lastWord !== '') {
        policiesSuggestions.forEach((policySuggestion) => {
          policySuggestion.rangeToReplace = {
            start: innerText.length - lastWord.length + 1,
            end: innerText.length + 1,
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

      return buildMatchingFieldsDefinition(policyMetadata.matchField, fieldNames);
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

      const word = findPreviousWord(innerText);
      if (policyMetadata.enrichFields.includes(unescapeColumnName(word))) {
        // complete field name
        return [pipeCompleteItem, withAutoSuggest(commaCompleteItem)];
      } else {
        // not recognized as a field name, assume new user-defined column name
        return getOperatorSuggestions(
          { location: Location.ENRICH },
          callbacks?.hasMinimumLicenseRequired,
          context?.activeProduct
        );
      }
    }

    case Position.WITH_AFTER_ASSIGNMENT: {
      const suggestions: ISuggestionItem[] = [];
      suggestions.push(...(await getFieldSuggestionsForWithClause()));
      return suggestions;
    }

    case Position.WITH_AFTER_COMPLETE_CLAUSE: {
      return [pipeCompleteItem, withAutoSuggest(commaCompleteItem)];
    }

    default:
      return [];
  }
}
