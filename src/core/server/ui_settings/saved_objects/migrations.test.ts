/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
