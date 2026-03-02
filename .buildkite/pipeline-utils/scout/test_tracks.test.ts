/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scoutTestTrack } from './test_tracks';

jest.mock('./paths', () => ({
  SCOUT_OUTPUT_ROOT: '',
}));

describe('scoutTestTrack.definitions', () => {
  let tmpDir: string;
  let pathsMock: { SCOUT_OUTPUT_ROOT: string };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-tracks-test-'));
    pathsMock = require('./paths');
    pathsMock.SCOUT_OUTPUT_ROOT = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('all', () => {
    it('returns only files matching test_tracks_*.json pattern', () => {
      fs.writeFileSync(path.join(tmpDir, 'test_tracks_123.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'test_tracks_456.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'other.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'test_track_789.json'), '{}');

      const results = scoutTestTrack.definitions.all();

      expect(results).toHaveLength(2);
      expect(results.every((r) => path.basename(r).startsWith('test_tracks_'))).toBe(true);
    });

    it('sorts files in descending order', () => {
      fs.writeFileSync(path.join(tmpDir, 'test_tracks_100.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'test_tracks_300.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'test_tracks_200.json'), '{}');

      const results = scoutTestTrack.definitions.all();
      const basenames = results.map((r) => path.basename(r));

      expect(basenames).toEqual([
        'test_tracks_300.json',
        'test_tracks_200.json',
        'test_tracks_100.json',
      ]);
    });

    it('returns full resolved paths', () => {
      fs.writeFileSync(path.join(tmpDir, 'test_tracks_1.json'), '{}');

      const results = scoutTestTrack.definitions.all();

      expect(results[0]).toBe(path.resolve(tmpDir, 'test_tracks_1.json'));
    });

    it('returns empty array when no matching files exist', () => {
      const results = scoutTestTrack.definitions.all();
      expect(results).toEqual([]);
    });
  });

  describe('loadFromPath', () => {
    it('parses a valid test tracks JSON file', () => {
      const data = {
        tracks: [
          {
            stats: {
              lane: {
                count: 1,
                saturationPercent: 80,
                longestEstimate: 100,
                shortestEstimate: 100,
              },
              combinedRuntime: { target: 200, expected: 100, unused: 100, overflow: 0 },
            },
            lanes: [],
            metadata: {
              testTarget: { location: 'local', arch: 'stateful', domain: 'classic' },
              server: { configSet: 'default' },
            },
          },
        ],
      };

      const filePath = path.join(tmpDir, 'test_tracks_data.json');
      fs.writeFileSync(filePath, JSON.stringify(data));

      const result = scoutTestTrack.definitions.loadFromPath(filePath);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].metadata.testTarget.location).toBe('local');
    });
  });
});
