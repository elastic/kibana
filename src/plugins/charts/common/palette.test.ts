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

import { palette, defaultCustomColors } from './palette';
import { ExecutionContext } from '../../expressions/common';

describe('palette', () => {
  const fn = (
    context: null,
    args: { color?: string[]; gradient?: boolean; reverse?: boolean } = {}
  ) => {
    return palette().fn(
      context,
      { gradient: false, reverse: false, ...args },
      {} as ExecutionContext
    );
  };

  it('results a palette', () => {
    const result = fn(null);
    expect(result).toHaveProperty('type', 'palette');
  });

  describe('args', () => {
    describe('color', () => {
      it('sets colors', () => {
        const result = fn(null, { color: ['red', 'green', 'blue'] });
        expect(result.params.colors).toEqual(['red', 'green', 'blue']);
      });

      it('defaults to pault_tor_14 colors', () => {
        const result = fn(null);
        expect(result.params.colors).toEqual(defaultCustomColors);
      });
    });

    describe('gradient', () => {
      it('sets gradient', () => {
        let result = fn(null, { gradient: true });
        expect(result).toHaveProperty('gradient', true);

        result = fn(null, { gradient: false });
        expect(result).toHaveProperty('gradient', false);
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result).toHaveProperty('gradient', false);
      });
    });

    describe('reverse', () => {
      it('reverses order of the colors', () => {
        const result = fn(null, { reverse: true });
        expect(result.params.colors).toEqual(defaultCustomColors.reverse());
      });

      it('keeps the original order of the colors', () => {
        const result = fn(null, { reverse: false });
        expect(result.params.colors).toEqual(defaultCustomColors);
      });

      it(`defaults to 'false`, () => {
        const result = fn(null);
        expect(result.params.colors).toEqual(defaultCustomColors);
      });
    });
  });
});
