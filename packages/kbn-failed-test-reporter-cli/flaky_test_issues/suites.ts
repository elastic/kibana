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
 * The flaky tests of one `describe` block of a test file. Issues are tracked per suite rather
 * than per test: the tests of a block share its fixtures and hooks, and that is what gets fixed.
 * Tests the report knows no suite title for form one suite per file.
 */
export interface FlakySuite {
  filePath: string;
  framework: TestFramework;
  /** Titles of the enclosing `describe` blocks joined by spaces, when the report knows them. */
  suiteTitle?: string;
  configPath?: string;
  /** Code owners of every test in the suite, in first-seen order. */
  owners: string[];
  /** Ranked by failed builds, worst first. */
  tests: FlakyTestEntry[];
  /** Failed builds of any test in the suite per pipeline, most failed builds first. */
  byPipeline: FlakyTestPipelineStats[];
}

const fileKey = (framework: string, filePath: string): string => `${framework}\n${filePath}`;
const suiteKey = (framework: string, filePath: string, suiteTitle: string | undefined): string =>
  `${fileKey(framework, filePath)}\n${suiteTitle ?? ''}`;

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** Groups entries by framework, file and suite title and ranks suites by their worst test. */
export const groupIntoSuites = (
  entries: readonly FlakyTestEntry[],
  files: readonly FlakyTestFileStats[] = []
): FlakySuite[] => {
  const byKey = new Map<string, FlakyTestEntry[]>();
  for (const entry of entries) {
    const key = suiteKey(entry.framework, entry.filePath, entry.suiteTitle);
    byKey.set(key, [...(byKey.get(key) ?? []), entry]);
  }
  // The per-pipeline stats are per file; the suites of one file share them
  const pipelinesByFile = new Map(
    files.map((file) => [fileKey(file.framework, file.filePath), file.byPipeline])
  );

  const suites = [...byKey.values()].map((unranked): FlakySuite => {
    const tests = rankTests(unranked);
    const [worst] = tests;
    return {
      filePath: worst.filePath,
      framework: worst.framework,
      suiteTitle: worst.suiteTitle,
      configPath: tests.find((test) => test.configPath)?.configPath,
      owners: unique(tests.flatMap((test) => test.owners)),
      tests,
      byPipeline: pipelinesByFile.get(fileKey(worst.framework, worst.filePath)) ?? [],
    };
  });

  return suites.sort((a, b) => compareByFailedBuilds(a.tests[0], b.tests[0]));
};
