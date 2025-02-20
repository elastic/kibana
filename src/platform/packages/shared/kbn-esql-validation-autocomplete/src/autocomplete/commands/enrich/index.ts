/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLSource } from '@kbn/esql-ast';
import { findFinalWord, isSingleItem } from '../../../shared/helpers';
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
import { pipeCompleteItem } from '../../complete_items';

export async function suggest({
  innerText,
  command,
  getPolicies,
  getPolicyMetadata,
  getAllColumnNames,
}: CommandSuggestParams<'enrich'>): Promise<SuggestionRawDefinition[]> {
  const pos = getPosition(innerText, command);

  switch (pos) {
    case Position.MODE:
      return modeSuggestions;

    case Position.POLICY:
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

    case Position.AFTER_POLICY:
      return [onSuggestion, withSuggestion, pipeCompleteItem];

    case Position.MATCH_FIELD:
      const policyName = (
        command.args.find((arg) => isSingleItem(arg) && arg.type === 'source') as ESQLSource
      )?.name;

      if (!policyName) {
        return [];
      }

      const policyMetadata = await getPolicyMetadata(policyName);
      if (!policyMetadata) {
        return [];
      }

      return buildMatchingFieldsDefinition(policyMetadata.matchField, getAllColumnNames());

    case Position.AFTER_ON:
      return [withSuggestion, pipeCompleteItem];

    default:
      return [];
  }
}
