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
import { switchFn } from '../switch';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('switch', () => {
  const fn = functionWrapper(switchFn);
  const getter = value => () => value;
  const mockCases = [
    {
      type: 'case',
      matches: false,
      result: 1,
    },
    {
      type: 'case',
      matches: false,
      result: 2,
    },
    {
      type: 'case',
      matches: true,
      result: 3,
    },
    {
      type: 'case',
      matches: false,
      result: 4,
    },
    {
      type: 'case',
      matches: true,
      result: 5,
    },
  ];
  const nonMatchingCases = mockCases.filter(c => !c.matches);

  describe('spec', () => {
    it('is a function', () => {
      expect(fn).to.be.a('function');
    });
  });

  describe('function', () => {
    describe('with no cases', () => {
      it('should return the context if no default is provided', async () => {
        const context = 'foo';
        expect(await fn(context, {})).to.be(context);
      });

      it('should return the default if provided', async () => {
        const context = 'foo';
        const args = { default: () => 'bar' };
        expect(await fn(context, args)).to.be(args.default());
      });
    });

    describe('with no matching cases', () => {
      it('should return the context if no default is provided', async () => {
        const context = 'foo';
        const args = { case: nonMatchingCases.map(getter) };
        expect(await fn(context, args)).to.be(context);
      });

      it('should return the default if provided', async () => {
        const context = 'foo';
        const args = {
          case: nonMatchingCases.map(getter),
          default: () => 'bar',
        };
        expect(await fn(context, args)).to.be(args.default());
      });
    });

    describe('with matching cases', () => {
      it('should return the first match', async () => {
        const context = 'foo';
        const args = { case: mockCases.map(getter) };
        const firstMatch = mockCases.find(c => c.matches);
        expect(await fn(context, args)).to.be(firstMatch.result);
      });
    });
  });
});
