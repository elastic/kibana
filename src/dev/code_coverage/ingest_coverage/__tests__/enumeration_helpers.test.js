/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tryPath } from '../team_assignment/enumeration_helpers';

describe(`enumeration helper fns`, () => {
  describe(`tryPath`, () => {
    describe(`w/o glob file paths`, () => {
      it(`should return a right on an existing path`, () => {
        const aPath = 'src/dev/code_coverage/ingest_coverage/ingest.js';
        const actual = tryPath(aPath);
        expect(actual.isRight()).toBe(true);
      });
      it(`should return a left on a non existing path`, () => {
        const aPath = 'src/dev/code_coverage/ingest_coverage/does_not_exist.js';
        const actual = tryPath(aPath);
        expect(actual.isLeft()).toBe(true);
      });
    });
    describe(`with glob file paths`, () => {
      it(`should not error when the glob expands to nothing, but instead return a Left`, () => {
        const aPath = 'src/legacy/core_plugins/kibana/public/home/*.ts';
        const actual = tryPath(aPath);
        expect(actual.isLeft()).toBe(true);
      });
      it(`should return a right on a glob that does indeed expand`, () => {
        const aPath = 'src/dev/code_coverage/ingest_coverage/*.js';
        const actual = tryPath(aPath);
        expect(actual.isRight()).toBe(true);
      });
    });
  });
});
