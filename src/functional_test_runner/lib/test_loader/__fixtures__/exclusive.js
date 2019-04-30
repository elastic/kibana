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

/* eslint-env jest */

export default () => {
  before(jest.fn().mockName('root level before hook'));

  describe('foo', function () {
    this.tags('foo');

    beforeEach(jest.fn().mockName('beforeEach'));
    afterEach(jest.fn().mockName('afterEach'));

    // eslint-disable-next-line
    it.only('bar', jest.fn().mockName('barTest'));
    it('boom', jest.fn().mockName('should be ignored'));

    // eslint-disable-next-line
    describe.only('baz', function () {
      this.tags('foo2');
      it('box', jest.fn().mockName('boxTest in baz'));
      after(jest.fn().mockName('after boxTest in baz'));
    });

    // eslint-disable-next-line
    it.only('bar2', jest.fn().mockName('bar2Test'));
  });

  after(jest.fn().mockName('root level after hook'));

  it('skips this test', jest.fn().mockName('skip this test'));

  // eslint-disable-next-line
  it.only('includes this test', jest.fn().mockName('include this test'));
};
