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
import { caseFn } from '../case';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('case', () => {
  const fn = functionWrapper(caseFn);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('no args', () => {
      it('should return a case object that matches with the result as the context', async () => {
        const context = null;
        const args = {};
        expect(await fn(context, args)).to.eql({
          type: 'case',
          matches: true,
          result: context,
        });
      });
    });

    describe('no if or value', () => {
      it('should return the result if provided', async () => {
        const context = null;
        const args = {
          then: () => 'foo',
        };
        expect(await fn(context, args)).to.eql({
          type: 'case',
          matches: true,
          result: args.then(),
        });
      });
    });

    describe('with if', () => {
      it('should return as the matches prop', async () => {
        const context = null;
        const args = { if: false };
        expect(await fn(context, args)).to.eql({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });

    describe('with value', () => {
      it('should return whether it matches the context as the matches prop', async () => {
        const args = {
          when: () => 'foo',
          then: () => 'bar',
        };
        expect(await fn('foo', args)).to.eql({
          type: 'case',
          matches: true,
          result: args.then(),
        });
        expect(await fn('bar', args)).to.eql({
          type: 'case',
          matches: false,
          result: null,
        });
      });
    });

    describe('with if and value', () => {
      it('should return the if as the matches prop', async () => {
        const context = null;
        const args = {
          when: () => 'foo',
          if: true,
        };
        expect(await fn(context, args)).to.eql({
          type: 'case',
          matches: args.if,
          result: context,
        });
      });
    });
  });
});
