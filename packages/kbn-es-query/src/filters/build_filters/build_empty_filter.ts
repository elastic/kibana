/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, FilterMeta, FilterStateStore } from './types';

export const buildEmptyFilter = (isPinned: boolean, index?: string): Filter => {
  const meta: FilterMeta = {
    disabled: false,
    negate: false,
    alias: null,
    index,
  };
  const $state: Filter['$state'] = {
    store: isPinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
  };

  return { meta, $state };
};
