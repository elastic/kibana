/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const testSubjSelector = require('.');

describe('testSubjSelector()', function () {
  it('converts subjectSelectors to cssSelectors', function () {
    expect(testSubjSelector('foo bar')).toEqual('[data-test-subj="foo bar"]');
    expect(testSubjSelector('foo > bar')).toEqual('[data-test-subj="foo"] [data-test-subj="bar"]');
    expect(testSubjSelector('foo > bar baz')).toEqual(
      '[data-test-subj="foo"] [data-test-subj="bar baz"]'
    );
    expect(testSubjSelector('foo> ~bar')).toEqual('[data-test-subj="foo"] [data-test-subj~="bar"]');
    expect(testSubjSelector('~ foo')).toEqual('[data-test-subj~="foo"]');
    expect(testSubjSelector('~foo & ~ bar')).toEqual(
      '[data-test-subj~="foo"][data-test-subj~="bar"]'
    );
  });
});
