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
import { SCOUT_TEST_TRACKS_ROOT } from './paths.ts';

export interface ScoutTestLane {
  number: number;
  estimatedSetupDuration: number;
  runtimeTarget: number;
  runtimeEstimate: number;
  availableCapacity: number;
  status: 'open' | 'closed';
  isCongested: boolean;
  loads: string[];
  metadata: {
    buildkite: {
      agentQueue: string;
    };
    // Only set on lanes of combined tracks (see `--combineShortLanes` of `scout create-test-tracks`)
    loadGroups?: Array<{ configSet: string; loads: string[] }>;
  };
}

export interface ScoutTestTrack {
  stats: {
    lane: {
      count: number;
      saturationPercent: number;
      longestEstimate: number;
      shortestEstimate: number;
    };
    combinedRuntime: {
      target: number;
      expected: number;
      unused: number;
      overflow: number;
    };
  };
  lanes: ScoutTestLane[];
  metadata: {
    testTarget: {
      location: string;
      arch: string;
      domain: string;
    };
    // Not set on combined tracks, whose lanes list their server config sets in `loadGroups`
    server?: {
      configSet: string;
    };
  };
}

export const scoutTestTrack = {
  definitions: {
    all: () => {
      if (!fs.existsSync(SCOUT_TEST_TRACKS_ROOT)) {
        return [];
      }

      return fs
        .readdirSync(SCOUT_TEST_TRACKS_ROOT)
        .filter((filename) => filename.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a))
        .map((filename) => path.resolve(SCOUT_TEST_TRACKS_ROOT, filename));
    },

    loadFromPath: (definitionPath: string): { tracks: ScoutTestTrack[] } => {
      return JSON.parse(fs.readFileSync(definitionPath, 'utf8'));
    },
  },
};
