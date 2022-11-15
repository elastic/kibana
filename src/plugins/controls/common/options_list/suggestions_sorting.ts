/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SuggestionsSorting } from './types';

export const OptionsListSortingOptions: { [key: string]: SuggestionsSorting } = {
  docDescending: { by: '_count', direction: 'desc' },
  docAscending: { by: '_count', direction: 'asc' },
  keyDescending: { by: '_key', direction: 'desc' },
  keyAscending: { by: '_key', direction: 'asc' },
};
