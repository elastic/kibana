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

import expect from 'expect.js';
import { ifFn } from '../if';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('if', () => {
  const fn = functionWrapper(ifFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('condition passed', () => {
      it('with then', async () => {
        expect(await fn(null, { condition: true, then: () => 'foo' })).to.be('foo');
        expect(await fn(null, { condition: true, then: () => 'foo', else: () => 'bar' })).to.be(
          'foo'
        );
      });

      it('without then', async () => {
        expect(await fn(null, { condition: true })).to.be(null);
        expect(await fn('some context', { condition: true })).to.be('some context');
      });
    });

    describe('condition failed', () => {
      it('with else', async () =>
        expect(
          await fn('some context', { condition: false, then: () => 'foo', else: () => 'bar' })
        ).to.be('bar'));

      it('without else', async () =>
        expect(await fn('some context', { condition: false, then: () => 'foo' })).to.be(
          'some context'
        ));
    });

    describe('falsy values', () => {
      describe('for then', () => {
        it('with null', async () =>
          expect(await fn('some context', { condition: true, then: () => null })).to.be(null));

        it('with false', async () =>
          expect(await fn('some context', { condition: true, then: () => false })).to.be(false));

        it('with 0', async () =>
          expect(await fn('some context', { condition: true, then: () => 0 })).to.be(0));
      });

      describe('for else', () => {
        it('with null', async () =>
          expect(await fn('some context', { condition: false, else: () => null })).to.be(null));

        it('with false', async () =>
          expect(await fn('some context', { condition: false, else: () => false })).to.be(false));

        it('with 0', async () =>
          expect(await fn('some context', { condition: false, else: () => 0 })).to.be(0));
      });
    });
  });

  // TODO: Passing through context
});
