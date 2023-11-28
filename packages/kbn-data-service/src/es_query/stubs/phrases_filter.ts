/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterStateStore, PhrasesFilter } from '@kbn/es-query';

export const phrasesFilter: PhrasesFilter = {
  meta: {
    index: 'logstash-*',
    type: 'phrases',
    key: 'machine.os.raw',
    value: 'win xp, osx',
    params: ['win xp', 'osx'],
    negate: false,
    disabled: false,
    alias: null,
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  query: {},
};
