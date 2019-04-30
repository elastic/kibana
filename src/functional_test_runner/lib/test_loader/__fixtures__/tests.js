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

    beforeEach(jest.fn().mockName('hook1'));
    before('foo+bar', jest.fn().mockName('hook2'));

    it('bar', jest.fn().mockName('test1'));

    describe('baz', function () {
      this.tags(['b', 'a', 'r', 'bar']);

      it('box', jest.fn().mockName('test2'));
      afterEach('boxen', jest.fn().mockName('hook3'));
      it('box2', jest.fn().mockName('test3'));
    });

    it('bbar', jest.fn().mockName('test4')).tags(['b']);

    after(jest.fn().mockName('after hook'));
  });

  after(jest.fn().mockName('root level after hook'));
};
