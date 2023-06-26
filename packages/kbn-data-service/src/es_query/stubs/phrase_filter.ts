/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterStateStore, PhraseFilter } from '@kbn/es-query';

export const phraseFilter: PhraseFilter = {
  meta: {
    negate: false,
    index: 'logstash-*',
    type: 'phrase',
    key: 'machine.os',
    value: 'ios',
    disabled: false,
    alias: null,
    params: {
      query: 'ios',
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  query: {
    match_phrase: {
      'machine.os': 'ios',
    },
  },
};
