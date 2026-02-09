/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from './autocomplete/helpers';
import type { ISuggestionItem } from '../../registry/types';
import { SuggestionCategory } from '../../../shared/sorting/types';

export const buildValueDefinitions = (
  values: string[],
  options?: { advanceCursorAndOpenSuggestions?: boolean; addComma?: boolean }
): ISuggestionItem[] =>
  values.map((value) => {
    const suggestion: ISuggestionItem = {
      label: `"${value}"`,
      text: `"${value}"${options?.addComma ? ',' : ''}${
        options?.advanceCursorAndOpenSuggestions ? ' ' : ''
      }`,
      detail: i18n.translate('kbn-esql-language.esql.autocomplete.valueDefinition', {
        defaultMessage: 'Literal value',
      }),
      kind: 'Value',
      category: SuggestionCategory.VALUE,
    };

    return options?.advanceCursorAndOpenSuggestions ? withAutoSuggest(suggestion) : suggestion;
  });
