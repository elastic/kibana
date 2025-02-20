/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFinalWord } from '../../../shared/helpers';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import {
  Position,
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

    default:
      return [];
  }
}
