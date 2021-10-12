/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

describe('ui_settings 7.12.0 migrations', () => {
  const migration = migrations['7.12.0'];

  test('returns doc on empty object', () => {
    expect(migration({} as SavedObjectUnsanitizedDoc)).toEqual({
      references: [],
    });
  });
  test('properly migrates timepicker:quickRanges', () => {
    const initialQuickRange: any = {
      from: '123',
      to: '321',
      display: 'abc',
      section: 2,
    };
    const { section, ...migratedQuickRange } = initialQuickRange;

    const doc = {
      type: 'config',
      id: '8.0.0',
      attributes: {
        buildNum: 9007199254740991,
        'timepicker:quickRanges': JSON.stringify([initialQuickRange]),
      },
      references: [],
      updated_at: '2020-06-09T20:18:20.349Z',
      migrationVersion: {},
    };
    const migrated = migration(doc);
    expect(JSON.parse(migrated.attributes['timepicker:quickRanges'])).toEqual([migratedQuickRange]);
  });

  // https://github.com/elastic/kibana/issues/95616
  test('returns doc when "timepicker:quickRanges" is null', () => {
    const doc = {
      type: 'config',
      id: '8.0.0',
      attributes: {
        buildNum: 9007199254740991,
        'timepicker:quickRanges': null,
      },
      references: [],
      updated_at: '2020-06-09T20:18:20.349Z',
      migrationVersion: {},
    };
    const migrated = migration(doc);
    expect(migrated).toEqual(doc);
  });
});

describe('ui_settings 7.13.0 migrations', () => {
  const migration = migrations['7.13.0'];

  test('returns doc on empty object', () => {
    expect(migration({} as SavedObjectUnsanitizedDoc)).toEqual({
      references: [],
    });
  });
  test('properly renames ml:fileDataVisualizerMaxFileSize to fileUpload:maxFileSize', () => {
    const doc = {
      type: 'config',
      id: '8.0.0',
      attributes: {
        buildNum: 9007199254740991,
        'ml:fileDataVisualizerMaxFileSize': '250MB',
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
        'fileUpload:maxFileSize': '250MB',
      },
      references: [],
      updated_at: '2020-06-09T20:18:20.349Z',
      migrationVersion: {},
    });
  });
});

describe('ui_settings 8.0.0 migrations', () => {
  const migration = migrations['8.0.0'];

  test('returns doc on empty object', () => {
    expect(migration({} as SavedObjectUnsanitizedDoc)).toEqual({
      references: [],
    });
  });
  test('removes ui_settings from deleted region_map and tile_map plugins', () => {
    const doc = {
      type: 'config',
      id: '8.0.0',
      attributes: {
        buildNum: 9007199254740991,
        'visualization:regionmap:showWarnings': false,
        'visualization:tileMap:WMSdefaults': '{}',
        'visualization:tileMap:maxPrecision': 10,
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
      },
      references: [],
      updated_at: '2020-06-09T20:18:20.349Z',
      migrationVersion: {},
    });
  });
});
