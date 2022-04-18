/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PaletteOutput } from '@kbn/coloring';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { palette, CustomPaletteState, CustomPaletteArguments } from './index';
import { defaultCustomColors } from '../../constants';


describe('palette', () => {
  const fn = functionWrapper(palette()) as (
    context: null,
    args?: Partial<CustomPaletteArguments>
  ) => PaletteOutput<CustomPaletteState>;

  it('results a palette', async () => {
    const result = await fn(null);
    expect(result).toHaveProperty('type', 'palette');
  });

  describe('args', () => {
    describe('color', () => {
      it('sets colors', async () => {
        const result = await fn(null, { color: ['red', 'green', 'blue'] });
        expect(result.params!.colors).toEqual(['red', 'green', 'blue']);
      });

      it('defaults to pault_tor_14 colors', async () => {
        const result = await fn(null);
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });
    });

    describe('stop', () => {
      it('sets stops', async () => {
        const result = await fn(null, { color: ['red', 'green', 'blue'], stop: [1, 2, 3] });
        expect(result.params!.stops).toEqual([1, 2, 3]);
      });

      it('defaults to pault_tor_14 colors', async () => {
        const result = await fn(null);
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });
    });

    describe('gradient', () => {
      it('sets gradient', async () => {
        let result = await fn(null, { gradient: true });
        expect(result.params).toHaveProperty('gradient', true);

        result = await fn(null, { gradient: false });
        expect(result.params).toHaveProperty('gradient', false);
      });

      it('defaults to false', async () => {
        const result = await fn(null);
        expect(result.params).toHaveProperty('gradient', false);
      });
    });

    describe('reverse', () => {
      it('reverses order of the colors', async () => {
        const result = await fn(null, { reverse: true });
        expect(result.params!.colors).toEqual(defaultCustomColors.reverse());
      });

      it('keeps the original order of the colors', async () => {
        const result = await fn(null, { reverse: false });
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });

      it(`defaults to 'false`, async () => {
        const result = await fn(null);
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });

      it('keeps the stops order pristine when set', async () => {
        const stops = [1, 2, 3];
        const result = await fn(null, {
          color: ['red', 'green', 'blue'],
          stop: [1, 2, 3],
          reverse: true,
        });
        expect(result.params!.stops).toEqual(stops);
      });
    });
  });
});
