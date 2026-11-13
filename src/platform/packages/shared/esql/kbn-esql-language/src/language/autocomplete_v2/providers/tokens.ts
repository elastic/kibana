/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  commaCompleteItem,
  newLineCompleteItem,
  pipeCompleteItem,
} from '../../../commands/registry/complete_items';
import { withAutoSuggest } from '../../../commands/definitions/utils/autocomplete/helpers';
import type { ISuggestionItem } from '../../../commands/registry/types';
import type { Follower } from '../../../esql_js_sim/grammar';
import { SuggestionCategory } from '../../autocomplete/utils/sorting/types';

/** The item for a token with a fixed text, by the class of the token alone. */
export const provideToken = ({ class: tokenClass, text = '' }: Follower): ISuggestionItem[] => {
  switch (tokenClass) {
    case 'pipe':
      return [pipeCompleteItem];
    // A separator is followed by a space, so the next item of the list can be typed at once.
    case 'separator':
      return [withAutoSuggest({ ...commaCompleteItem, text: `${text} ` })];
    case 'keyword': {
      const label = text.toUpperCase();

      return [
        withAutoSuggest({
          label,
          text: `${label} `,
          kind: 'Reference',
          detail: label.charAt(0) + label.slice(1).toLowerCase(),
          category: SuggestionCategory.LANGUAGE_KEYWORD,
        }),
      ];
    }
    // Operators, brackets and statement ends are offered with the arguments they belong to.
    default:
      return [];
  }
};

/** The item that ends the command by moving to the next line. */
export const provideEndOfCommand = (): ISuggestionItem[] => [newLineCompleteItem];
