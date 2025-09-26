/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { withAutoSuggest } from '../../../definitions/utils/autocomplete/helpers';
import type { ESQLCommandOption, ESQLCommand } from '../../../types';
import type { ISuggestionItem } from '../../types';
import { buildFieldsDefinitions } from '../../../definitions/utils/functions';
import { handleFragment } from '../../../definitions/utils/autocomplete/helpers';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { isColumn, isOptionNode } from '../../../ast/is';

export const METADATA_FIELDS = [
  '_version',
  '_id',
  '_index',
  '_source',
  '_ignored',
  '_index_mode',
  '_score',
];

export const metadataSuggestion: ISuggestionItem = withAutoSuggest({
  label: 'METADATA',
  text: 'METADATA ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-ast.esql.definitions.metadataDoc', {
    defaultMessage: 'Metadata',
  }),
  sortText: '1',
});

export const getMetadataSuggestions = (command: ESQLCommand, queryText: string) => {
  const metadataNode = command.args.find((arg) => isOptionNode(arg) && arg.name === 'metadata') as
    | ESQLCommandOption
    | undefined;

  // FROM index METADATA ... /
  if (metadataNode) {
    return suggestForMetadata(metadataNode, queryText);
  }
};

async function suggestForMetadata(metadata: ESQLCommandOption, innerText: string) {
  const existingFields = new Set(metadata.args.filter(isColumn).map(({ name }) => name));
  const filteredMetaFields = METADATA_FIELDS.filter((name) => !existingFields.has(name));
  const suggestions: ISuggestionItem[] = [];

  // FROM something METADATA /
  // FROM something METADATA field/
  // FROM something METADATA field, /
  if (/(?:,|METADATA)\s+$/i.test(innerText) || /\S$/.test(innerText)) {
    suggestions.push(
      ...(await handleFragment(
        innerText,
        (fragment) => METADATA_FIELDS.includes(fragment),
        (_fragment, rangeToReplace) =>
          buildFieldsDefinitions(filteredMetaFields).map((suggestion) => ({
            ...suggestion,
            rangeToReplace,
          })),
        (fragment, rangeToReplace) => {
          const _suggestions = [
            withAutoSuggest({
              ...pipeCompleteItem,
              text: fragment + ' | ',
              filterText: fragment,
              rangeToReplace,
            }),
          ];
          if (filteredMetaFields.length > 1) {
            _suggestions.push(
              withAutoSuggest({
                ...commaCompleteItem,
                text: fragment + ', ',
                filterText: fragment,
                rangeToReplace,
              })
            );
          }
          return _suggestions;
        }
      ))
    );
  } else {
    // METADATA field /
    if (existingFields.size > 0) {
      if (filteredMetaFields.length > 0) {
        suggestions.push(commaCompleteItem);
      }
      suggestions.push(pipeCompleteItem);
    }
  }

  return suggestions;
}
