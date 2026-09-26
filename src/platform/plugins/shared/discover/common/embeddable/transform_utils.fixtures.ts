/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { StoredSearchEmbeddableByValueState } from './types';

/** Wraps one stored tab in by-value panel state without panel overrides. */
export const toByValuePanelState = (
  tabAttributes: DiscoverSessionTabAttributes
): StoredSearchEmbeddableByValueState => ({
  attributes: {
    title: '',
    description: '',
    sort: [],
    columns: [],
    grid: {},
    hideChart: false,
    hideTable: false,
    isTextBasedQuery: tabAttributes.isTextBasedQuery,
    kibanaSavedObjectMeta: tabAttributes.kibanaSavedObjectMeta,
    tabs: [{ id: 'panel-tab', label: 'Panel tab', attributes: tabAttributes }],
  },
});
