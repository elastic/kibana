/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groupIntoSuites } from './suites';
import { flakyTest } from './test_fixtures';

describe('groupIntoSuites', () => {
  it('groups tests by file, ranks tests within a suite and suites by their worst test', () => {
    const suites = groupIntoSuites([
      flakyTest({ testId: 'a1', filePath: 'a.spec.ts', failedBuilds: 2 }),
      flakyTest({ testId: 'b1', filePath: 'b.spec.ts', failedBuilds: 5 }),
      flakyTest({ testId: 'a2', filePath: 'a.spec.ts', failedBuilds: 9 }),
    ]);

    expect(suites.map((suite) => suite.filePath)).toEqual(['a.spec.ts', 'b.spec.ts']);
    expect(suites[0].tests.map((test) => test.testId)).toEqual(['a2', 'a1']);
  });

  it('describes a suite from its tests and picks up the per-pipeline stats of its file', () => {
    const byPipeline = [
      {
        pipeline: 'kibana-on-merge',
        builds: 10,
        failedBuilds: 4,
        buildFailRate: 0.4,
        failedBranches: 1,
      },
    ];
    const [suite] = groupIntoSuites(
      [
        flakyTest({
          testId: 'a1',
          filePath: 'a.spec.ts',
          failedBuilds: 2,
          suiteTitle: undefined,
          configPath: undefined,
          owners: ['elastic/team-a'],
        }),
        flakyTest({
          testId: 'a2',
          filePath: 'a.spec.ts',
          failedBuilds: 9,
          suiteTitle: 'suite a',
          configPath: 'a.config.ts',
          owners: ['elastic/team-b', 'elastic/team-a'],
        }),
      ],
      [
        { filePath: 'a.spec.ts', framework: 'playwright', testIds: ['a1', 'a2'], byPipeline },
        { filePath: 'a.spec.ts', framework: 'jest', testIds: ['other'], byPipeline: [] },
      ]
    );

    expect(suite).toMatchObject({
      filePath: 'a.spec.ts',
      framework: 'playwright',
      suiteTitle: 'suite a',
      configPath: 'a.config.ts',
      owners: ['elastic/team-b', 'elastic/team-a'],
      byPipeline,
    });
  });

  it('keeps the same file apart per framework', () => {
    const suites = groupIntoSuites([
      flakyTest({ testId: 'j', filePath: 'a.ts', framework: 'jest' }),
      flakyTest({ testId: 'p', filePath: 'a.ts', framework: 'playwright' }),
    ]);

    expect(suites.map((suite) => suite.framework).sort()).toEqual(['jest', 'playwright']);
    expect(suites[0].byPipeline).toEqual([]);
  });

  it('returns no suites for an empty report', () => {
    expect(groupIntoSuites([])).toEqual([]);
  });
});
