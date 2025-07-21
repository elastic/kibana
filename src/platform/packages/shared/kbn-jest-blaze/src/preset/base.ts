/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Config } from '@jest/types';
import defaultPreset from '@kbn/test/jest-preset';
import { REPO_ROOT } from '@kbn/repo-info';
import Path from 'path';
import { mapValues } from 'lodash';

function replaceWithRoot<T extends string | undefined>(location?: T): T;

function replaceWithRoot(location?: string) {
  if (location) {
    return location.replace('<rootDir>', REPO_ROOT);
  }
  return location;
}

function replaceAllWithRoot(locations?: string[]) {
  if (locations) {
    return locations.map(replaceWithRoot);
  }
  return locations;
}

const shouldRewrite =
  ['1', 'true'].includes(process.env.JEST_BLAZE_DISABLE_REWRITE ?? '') === false;

const shouldProfile = ['1', 'true'].includes(process.env.JEST_BLAZE_PROFILE ?? '') === true;
/**
 * This is a minimal config for Jest, that consumers can use as a baseline.
 * `@kbn/test` is more complete, but does a lot of things out of the box that
 * are not necessary in many cases, and lead to slower startup times.
 */
export const base: Config.InitialOptions = {
  coverageDirectory: replaceWithRoot(defaultPreset.coverageDirectory),
  coveragePathIgnorePatterns: replaceAllWithRoot(defaultPreset.coveragePathIgnorePatterns),
  ...(process.env.CODE_COVERAGE
    ? {
        coverageReporters: defaultPreset.coverageReporters?.map((reporter) => {
          if (typeof reporter === 'string') {
            return replaceWithRoot(reporter);
          }
          return [replaceWithRoot(reporter[0]), ...reporter.slice(1)];
        }) as Config.CoverageReporters | undefined,
        collectCoverageFrom: defaultPreset.collectCoverageFrom,
      }
    : {
        coverageReporters: [],
      }),
  reporters: ['default', ...(shouldProfile ? [require.resolve('../profiler/reporter')] : [])],
  setupFiles: [],
  snapshotFormat: defaultPreset.snapshotFormat,
  moduleNameMapper: {
    // do not use these, they're so slow. We have a custom resolver that can handle resolving different types of requests.
  },
  moduleFileExtensions: defaultPreset.moduleFileExtensions,
  testMatch: ['<rootDir>/**/*.test.{js,mjs,ts,tsx}'],
  testPathIgnorePatterns: [`integration_tests/`],
  transform: {
    ...mapValues(defaultPreset.transform, (value, key) => {
      if (typeof value === 'string') {
        return replaceWithRoot(value);
      }
      return [replaceWithRoot(value[0]), ...value.slice(1)];
    }),
    '^.+\\.(js|tsx?)$': [
      require.resolve('../transformer/create_transformer'),
      {
        ignorePatterns: ['node_modules', '.json', '.peggy', '.text'],
        rewrite: shouldRewrite,
        profile: shouldProfile,
      },
    ],
  },
  haste: {
    ...defaultPreset.haste,
    hasteMapModulePath: require.resolve('../haste'),
  },
  transformIgnorePatterns: defaultPreset.transformIgnorePatterns,
  watchPathIgnorePatterns: ['.*/__tmp__/.*'],
  resolver: Path.join(REPO_ROOT, '/src/platform/packages/shared/kbn-test/src/jest/resolver.js'),
  testResultsProcessor: Path.join(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-test/src/jest/result_processors/logging_result_processor.js'
  ),
};
