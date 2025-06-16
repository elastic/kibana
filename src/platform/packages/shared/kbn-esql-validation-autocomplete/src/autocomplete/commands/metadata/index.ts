/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommandOption, ESQLCommand } from '@kbn/esql-ast';
import type { SuggestionRawDefinition } from '../../types';
import { TRIGGER_SUGGESTION_COMMAND, buildFieldsDefinitions } from '../../factories';
import { handleFragment } from '../../helper';
import { commaCompleteItem, pipeCompleteItem } from '../../complete_items';
import { METADATA_FIELDS } from '../../../shared/constants';
import { isColumnItem, isOptionItem } from '../../../shared/helpers';

export const metadataSuggestion: SuggestionRawDefinition = {
  label: 'METADATA',
  text: 'METADATA ',
  kind: 'Reference',
  detail: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.metadataDoc', {
    defaultMessage: 'Metadata',
  }),
  sortText: '1',
  command: TRIGGER_SUGGESTION_COMMAND,
};

export const getMetadataSuggestions = (
  command: ESQLCommand<'from'> | ESQLCommand<'ts'>,
  queryText: string
) => {
  const metadataNode = command.args.find((arg) => isOptionItem(arg) && arg.name === 'metadata') as
    | ESQLCommandOption
    | undefined;

  // FROM index METADATA ... /
  if (metadataNode) {
    return suggestForMetadata(metadataNode, queryText);
  }
};

async function suggestForMetadata(metadata: ESQLCommandOption, innerText: string) {
  const existingFields = new Set(metadata.args.filter(isColumnItem).map(({ name }) => name));
  const filteredMetaFields = METADATA_FIELDS.filter((name) => !existingFields.has(name));
  const suggestions: SuggestionRawDefinition[] = [];

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
            {
              ...pipeCompleteItem,
              text: fragment + ' | ',
              filterText: fragment,
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            },
          ];
          if (filteredMetaFields.length > 1) {
            _suggestions.push({
              ...commaCompleteItem,
              text: fragment + ', ',
              filterText: fragment,
              command: TRIGGER_SUGGESTION_COMMAND,
              rangeToReplace,
            });
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
