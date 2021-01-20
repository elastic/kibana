/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { transformRawCounter } from './register_ui_counters_collector';
import { UICounterSavedObject } from './ui_counter_saved_object_type';

describe('transformRawCounter', () => {
  const mockRawUiCounters = [
    {
      type: 'ui-counter',
      id: 'Kibana_home:24112020:click:ingest_data_card_home_tutorial_directory',
      attributes: {
        count: 3,
      },
      references: [],
      updated_at: '2020-11-24T11:27:57.067Z',
      version: 'WzI5LDFd',
    },
    {
      type: 'ui-counter',
      id: 'Kibana_home:24112020:click:home_tutorial_directory',
      attributes: {
        count: 1,
      },
      references: [],
      updated_at: '2020-11-24T11:27:57.067Z',
      version: 'WzI5NDRd',
    },
    {
      type: 'ui-counter',
      id: 'Kibana_home:24112020:loaded:home_tutorial_directory',
      attributes: {
        count: 3,
      },
      references: [],
      updated_at: '2020-10-23T11:27:57.067Z',
      version: 'WzI5NDRd',
    },
  ] as UICounterSavedObject[];

  it('transforms saved object raw entries', () => {
    const result = mockRawUiCounters.map(transformRawCounter);
    expect(result).toEqual([
      {
        appName: 'Kibana_home',
        eventName: 'ingest_data_card_home_tutorial_directory',
        lastUpdatedAt: '2020-11-24T11:27:57.067Z',
        fromTimestamp: '2020-11-24T00:00:00Z',
        counterType: 'click',
        total: 3,
      },
      {
        appName: 'Kibana_home',
        eventName: 'home_tutorial_directory',
        lastUpdatedAt: '2020-11-24T11:27:57.067Z',
        fromTimestamp: '2020-11-24T00:00:00Z',
        counterType: 'click',
        total: 1,
      },
      {
        appName: 'Kibana_home',
        eventName: 'home_tutorial_directory',
        lastUpdatedAt: '2020-10-23T11:27:57.067Z',
        fromTimestamp: '2020-10-23T00:00:00Z',
        counterType: 'loaded',
        total: 3,
      },
    ]);
  });
});
