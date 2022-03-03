/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Suite } from 'mocha';

declare module 'mocha' {
  interface Suite {
    /**
     * Assign tags to the test suite to determine in which CI job it should be run.
     */
    tags(tags: string[] | string): void;
    /**
     * Define the ES versions for which this test requires, any version which doesn't meet this range will
     * cause these tests to be skipped
     * @param semver any valid semver range, like ">=8"
     */
    onlyEsVersion(semver: string): void;
  }
}
