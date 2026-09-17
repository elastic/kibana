/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  compareByFailedBuilds,
  rankTests,
  type FlakyTestEntry,
  type FlakyTestFileStats,
  type FlakyTestPipelineStats,
  type TestFramework,
} from '@kbn/scout-reporting';

/**
 * All flaky tests of one test file. Issues are tracked per suite rather than per test: the tests
 * of a file usually share a fixture, a page object or a setup hook, and that is what gets fixed.
 */
export interface FlakySuite {
  filePath: string;
  framework: TestFramework;
  /** Title of the outermost `describe`, when the report knows it. */
  suiteTitle?: string;
  configPath?: string;
  /** Code owners of every test in the suite, in first-seen order. */
  owners: string[];
  /** Ranked by failed builds, worst first. */
  tests: FlakyTestEntry[];
  /** Failed builds of any test in the suite per pipeline, most failed builds first. */
  byPipeline: FlakyTestPipelineStats[];
}

const suiteKey = (framework: string, filePath: string): string => `${framework}\n${filePath}`;

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** Groups entries by framework and file and ranks suites by their worst test. */
export const groupIntoSuites = (
  entries: readonly FlakyTestEntry[],
  files: readonly FlakyTestFileStats[] = []
): FlakySuite[] => {
  const byKey = new Map<string, FlakyTestEntry[]>();
  for (const entry of entries) {
    const key = suiteKey(entry.framework, entry.filePath);
    byKey.set(key, [...(byKey.get(key) ?? []), entry]);
  }
  const pipelinesByKey = new Map(
    files.map((file) => [suiteKey(file.framework, file.filePath), file.byPipeline])
  );

  const suites = [...byKey.entries()].map(([key, unranked]): FlakySuite => {
    const tests = rankTests(unranked);
    const [worst] = tests;
    return {
      filePath: worst.filePath,
      framework: worst.framework,
      suiteTitle: tests.find((test) => test.suiteTitle)?.suiteTitle,
      configPath: tests.find((test) => test.configPath)?.configPath,
      owners: unique(tests.flatMap((test) => test.owners)),
      tests,
      byPipeline: pipelinesByKey.get(key) ?? [],
    };
  });

  return suites.sort((a, b) => compareByFailedBuilds(a.tests[0], b.tests[0]));
};
