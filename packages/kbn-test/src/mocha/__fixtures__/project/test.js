/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

describe('SUITE', () => {
  it('works', () => {});
  it('fails', () => {
    throw new Error('FORCE_TEST_FAIL');
  });

  describe('SUB_SUITE', () => {
    beforeEach('success hook', () => {});
    beforeEach('fail hook', () => {
      throw new Error('FORCE_HOOK_FAIL');
    });

    it('never runs', () => {});
  });
});
