/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildDocumentation } from './utils';

import type { AutocompleteCommandDefinition } from '../types';

export const sourceCommandsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'from',
    insertText: 'from',
    kind: 0,
    detail: i18n.translate('monaco.esql.autocomplete.fromDoc', {
      defaultMessage:
        'Retrieves data from one or more datasets. A dataset is a collection of data that you want to search. The only supported dataset is an index. In a query or subquery, you must use the from command first and it does not need a leading pipe. For example, to retrieve data from an index:',
    }),
    documentation: {
      value: buildDocumentation(
        'from` indexPatterns = wildcardIdentifier (`,` wildcardIdentifier)*',
        ['from logs', 'from logs-*', 'from logs_*, events-*', 'from from remote*:logs*']
      ),
    },
    sortText: 'A',
  },
];
