/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectTemplate } from './__jest__/test_bench';

describe('builtin helpers', () => {
  describe('#lookup', () => {
    it('should lookup arbitrary content', () => {
      expectTemplate('{{#each goodbyes}}{{lookup ../data .}}{{/each}}')
        .withInput({ goodbyes: [0, 1], data: ['foo', 'bar'] })
        .toCompileTo('foobar');
    });

    it('should not fail on undefined value', () => {
      expectTemplate('{{#each goodbyes}}{{lookup ../bar .}}{{/each}}')
        .withInput({ goodbyes: [0, 1], data: ['foo', 'bar'] })
        .toCompileTo('');
    });
  });
});
