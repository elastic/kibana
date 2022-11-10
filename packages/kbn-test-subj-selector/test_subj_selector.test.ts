/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { subj } from './test_subj_selector';

describe('testSubjSelector()', function () {
  it('converts subjectSelectors to cssSelectors', function () {
    expect(subj('foo bar')).toEqual('[data-test-subj="foo bar"]');
    expect(subj('foo > bar')).toEqual('[data-test-subj="foo"] [data-test-subj="bar"]');
    expect(subj('foo > bar baz')).toEqual('[data-test-subj="foo"] [data-test-subj="bar baz"]');
    expect(subj('foo> ~bar')).toEqual('[data-test-subj="foo"] [data-test-subj~="bar"]');
    expect(subj('~ foo')).toEqual('[data-test-subj~="foo"]');
    expect(subj('~foo & ~ bar')).toEqual('[data-test-subj~="foo"][data-test-subj~="bar"]');
  });
});
