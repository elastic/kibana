/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UICounterSavedObject } from '../ui_counter_saved_object_type';
export const rawUiCounters: UICounterSavedObject[] = [
  {
    type: 'ui-counter',
    id: 'Kibana_home:23102020:click:different_type',
    attributes: {
      count: 1,
    },
    references: [],
    updated_at: '2020-11-24T11:27:57.067Z',
    version: 'WzI5NDRd',
  },
  {
    type: 'ui-counter',
    id: 'Kibana_home:25102020:loaded:intersecting_event',
    attributes: {
      count: 1,
    },
    references: [],
    updated_at: '2020-10-25T11:27:57.067Z',
    version: 'WzI5NDRd',
  },
  {
    type: 'ui-counter',
    id: 'Kibana_home:23102020:loaded:intersecting_event',
    attributes: {
      count: 3,
    },
    references: [],
    updated_at: '2020-10-23T11:27:57.067Z',
    version: 'WzI5NDRd',
  },
  {
    type: 'ui-counter',
    id: 'Kibana_home:24112020:click:only_reported_in_ui_counters',
    attributes: {
      count: 1,
    },
    references: [],
    updated_at: '2020-11-24T11:27:57.067Z',
    version: 'WzI5NDRd',
  },
];
