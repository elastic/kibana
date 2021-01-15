/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
