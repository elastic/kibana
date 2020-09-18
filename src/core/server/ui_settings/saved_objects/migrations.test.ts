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

import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { migrations } from './migrations';

describe('ui_settings 7.9.0 migrations', () => {
  const migration = migrations['7.9.0'];

  test('returns doc on empty object', () => {
    expect(migration({} as SavedObjectUnsanitizedDoc)).toEqual({
      references: [],
    });
  });
  test('properly renames siem attributes to securitySolution', () => {
    const doc = {
      type: 'config',
      id: '8.0.0',
      attributes: {
        buildNum: 9007199254740991,
        'siem:defaultAnomalyScore': 59,
        'siem:enableNewsFeed': false,
      },
      references: [],
      updated_at: '2020-06-09T20:18:20.349Z',
      migrationVersion: {},
    };
    expect(migration(doc)).toEqual({
      type: 'config',
      id: '8.0.0',
      attributes: {
        buildNum: 9007199254740991,
        'securitySolution:defaultAnomalyScore': 59,
        'securitySolution:enableNewsFeed': false,
      },
      references: [],
      updated_at: '2020-06-09T20:18:20.349Z',
      migrationVersion: {},
    });
  });
});
