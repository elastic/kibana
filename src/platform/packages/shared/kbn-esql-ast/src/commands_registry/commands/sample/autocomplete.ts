/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommand } from '../../../types';
import {
  type ISuggestionItem,
  type GetColumnsByTypeFn,
  type ICommandContext,
  ESQLFieldWithMetadata,
} from '../../types';
import { pipeCompleteItem } from '../../utils/autocomplete/complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../constants';

export async function autocomplete(
  query: string,
  command: ESQLCommand,
  getColumnsByType: GetColumnsByTypeFn,
  getSuggestedUserDefinedColumnName: (extraFieldNames?: string[] | undefined) => string,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
): Promise<ISuggestionItem[]> {
  // SHOW INFO /
  if (/INFO\s+$/i.test(query)) {
    return [{ ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
  }
  // SHOW LOLZ /
  else if (/SHOW\s+\S+\s+$/i.test(query)) {
    return [];
  }
  // SHOW /
  return [
    {
      text: 'INFO',
      detail: i18n.translate('kbn-esql-validation-autocomplete.esql.show.info.detail', {
        defaultMessage: 'Get information about the Elasticsearch cluster.',
      }),
      kind: 'Method',
      label: 'INFO',
    },
  ];
}
