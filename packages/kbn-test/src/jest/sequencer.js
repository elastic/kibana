/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Sequencer = require('@jest/test-sequencer').default;

class ParallelSequencer extends Sequencer {
  jobsCount = parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10);
  jobIndex = parseInt(process.env.BUILDKITE_PARALLEL_JOB, 10);

  sort(tests) {
    if (!process.env.CI || !this.jobsCount) return tests;

    const testsByFile = new Map();
    const testPaths = new Set();

    for (const test of tests) {
      testsByFile[test.path] = testsByFile[test.path] || [];
      testsByFile[test.path].push(test);
      testPaths.add(test.path);
    }

    const chunkSize = Math.ceil(testPaths.size / this.jobsCount);
    const minIndex = this.jobIndex * chunkSize;
    const maxIndex = minIndex + chunkSize;

    const pathsToRun = [...testPaths].filter((_, index) => {
      return index >= minIndex && index <= maxIndex;
    });

    const testsToRun = pathsToRun.map((path) => testsByFile[path]).flat();

    return testsToRun;
  }
}

module.exports = ParallelSequencer;
