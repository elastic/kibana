/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  palette,
  defaultCustomColors,
  systemPalette,
  PaletteOutput,
  CustomPaletteState,
} from './palette';
import { functionWrapper } from 'src/plugins/expressions/common/expression_functions/specs/tests/utils';

describe('palette', () => {
  const fn = functionWrapper(palette()) as (
    context: null,
    args?: { color?: string[]; gradient?: boolean; reverse?: boolean }
  ) => PaletteOutput<CustomPaletteState>;

  it('results a palette', () => {
    const result = fn(null);
    expect(result).toHaveProperty('type', 'palette');
  });

  describe('args', () => {
    describe('color', () => {
      it('sets colors', () => {
        const result = fn(null, { color: ['red', 'green', 'blue'] });
        expect(result.params!.colors).toEqual(['red', 'green', 'blue']);
      });

      it('defaults to pault_tor_14 colors', () => {
        const result = fn(null);
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });
    });

    describe('gradient', () => {
      it('sets gradient', () => {
        let result = fn(null, { gradient: true });
        expect(result.params).toHaveProperty('gradient', true);

        result = fn(null, { gradient: false });
        expect(result.params).toHaveProperty('gradient', false);
      });

      it('defaults to false', () => {
        const result = fn(null);
        expect(result.params).toHaveProperty('gradient', false);
      });
    });

    describe('reverse', () => {
      it('reverses order of the colors', () => {
        const result = fn(null, { reverse: true });
        expect(result.params!.colors).toEqual(defaultCustomColors.reverse());
      });

      it('keeps the original order of the colors', () => {
        const result = fn(null, { reverse: false });
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });

      it(`defaults to 'false`, () => {
        const result = fn(null);
        expect(result.params!.colors).toEqual(defaultCustomColors);
      });
    });
  });
});

describe('system_palette', () => {
  const fn = functionWrapper(systemPalette()) as (
    context: null,
    args: { name: string; params?: unknown }
  ) => PaletteOutput<unknown>;

  it('results a palette', () => {
    const result = fn(null, { name: 'test' });
    expect(result).toHaveProperty('type', 'palette');
  });

  it('returns the name', () => {
    const result = fn(null, { name: 'test' });
    expect(result).toHaveProperty('name', 'test');
  });
});
