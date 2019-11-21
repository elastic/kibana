/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const testSubjSelector = require('../');
const expect = require('@kbn/expect');

describe('testSubjSelector()', function() {
  it('converts subjectSelectors to cssSelectors', function() {
    expect(testSubjSelector('foo bar')).to.eql('[data-test-subj="foo bar"]');
    expect(testSubjSelector('foo > bar')).to.eql('[data-test-subj="foo"] [data-test-subj="bar"]');
    expect(testSubjSelector('foo > bar baz')).to.eql(
      '[data-test-subj="foo"] [data-test-subj="bar baz"]'
    );
    expect(testSubjSelector('foo> ~bar')).to.eql('[data-test-subj="foo"] [data-test-subj~="bar"]');
    expect(testSubjSelector('~ foo')).to.eql('[data-test-subj~="foo"]');
    expect(testSubjSelector('~foo & ~ bar')).to.eql(
      '[data-test-subj~="foo"][data-test-subj~="bar"]'
    );
  });
});
