/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Sequencer = require('@jest/test-sequencer').default;

/**
 * Custom Jest test sequencer that sorts tests alphabetically by file path.
 * This ensures consistent test execution order across runs.
 */
class AlphabeticalTestSequencer extends Sequencer {
  /**
   * Sort tests alphabetically by their file path
   * @param {Array} tests - Array of test objects with path property
   * @returns {Array} Sorted array of tests
   */
  sort(tests) {
    // Create a copy to avoid mutating the original array
    const testsCopy = Array.from(tests);

    return testsCopy.sort((testA, testB) => {
      // Sort by path property alphabetically (ascending)
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = AlphabeticalTestSequencer;
