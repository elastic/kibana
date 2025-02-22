/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLSource } from '@kbn/esql-ast';
import {
  findFinalWord,
  findPreviousWord,
  isSingleItem,
  unescapeColumnName,
} from '../../../shared/helpers';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import {
  Position,
  buildMatchingFieldsDefinition,
  getPosition,
  modeSuggestions,
  noPoliciesAvailableSuggestion,
  onSuggestion,
  withSuggestion,
} from './util';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import {
  TRIGGER_SUGGESTION_COMMAND,
  buildFieldsDefinitions,
  getNewVariableSuggestion,
  getOperatorSuggestions,
} from '../../factories';

export async function suggest({
  innerText,
  command,
  getPolicies,
  getPolicyMetadata,
  getAllColumnNames,
  getSuggestedVariableName,
}: CommandSuggestParams<'enrich'>): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  const policyName = (
    command.args.find((arg) => isSingleItem(arg) && arg.type === 'source') as ESQLSource | undefined
  )?.name;

  const getFieldSuggestionsForWithClause = async () => {
    if (!policyName) {
      return [];
    }

    const policyMetadata = await getPolicyMetadata(policyName);
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
      const policies = await getPolicies();
      const lastWord = findFinalWord(innerText);
      if (lastWord !== '') {
        policies.forEach((policySuggestion) => {
          policySuggestion.rangeToReplace = {
            start: innerText.length - lastWord.length + 1,
            end: innerText.length + 1,
          };
        });
      }
      return policies.length ? policies : [noPoliciesAvailableSuggestion];
    }

    case Position.AFTER_POLICY:
      return [onSuggestion, withSuggestion, pipeCompleteItem];

    case Position.MATCH_FIELD: {
      if (!policyName) {
        return [];
      }

      const policyMetadata = await getPolicyMetadata(policyName);
      if (!policyMetadata) {
        return [];
      }

      return buildMatchingFieldsDefinition(policyMetadata.matchField, getAllColumnNames());
    }

    case Position.AFTER_ON_CLAUSE:
      return [withSuggestion, pipeCompleteItem];

    case Position.WITH_NEW_CLAUSE: {
      if (!policyName) {
        return [];
      }

      const policyMetadata = await getPolicyMetadata(policyName);
      if (!policyMetadata) {
        return [];
      }

      const suggestions: SuggestionRawDefinition[] = [];
      suggestions.push(
        getNewVariableSuggestion(getSuggestedVariableName(policyMetadata.enrichFields))
      );
      suggestions.push(...(await getFieldSuggestionsForWithClause()));
      return suggestions;
    }

    case Position.WITH_AFTER_FIRST_WORD: {
      if (!policyName) {
        return [];
      }
      const policyMetadata = await getPolicyMetadata(policyName);

      if (!policyMetadata) {
        return [];
      }

      const word = findPreviousWord(innerText);
      if (policyMetadata.enrichFields.includes(unescapeColumnName(word))) {
        // complete field name
        return [pipeCompleteItem, { ...commaCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
      } else {
        // not recognized as a field name, assume new user-defined column name
        return getOperatorSuggestions({ command: 'enrich' });
      }
    }

    case Position.WITH_AFTER_ASSIGNMENT: {
      const suggestions: SuggestionRawDefinition[] = [];
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
