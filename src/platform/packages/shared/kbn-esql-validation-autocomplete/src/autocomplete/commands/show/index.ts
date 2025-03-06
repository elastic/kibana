/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { CommandSuggestParams } from '../../../definitions/types';
import type { SuggestionRawDefinition } from '../../types';
import { pipeCompleteItem } from '../../complete_items';
import { TRIGGER_SUGGESTION_COMMAND } from '../../factories';

export async function suggest({
  innerText,
}: CommandSuggestParams<'show'>): Promise<SuggestionRawDefinition[]> {
  // SHOW INFO /
  if (/INFO\s+$/i.test(innerText)) {
    return [{ ...pipeCompleteItem, command: TRIGGER_SUGGESTION_COMMAND }];
  }
  // SHOW LOLZ /
  else if (/SHOW\s+\S+\s+$/i.test(innerText)) {
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
