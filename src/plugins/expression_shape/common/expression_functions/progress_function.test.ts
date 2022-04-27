/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from '@kbn/expressions-plugin';
import { functionWrapper, fontStyle } from '@kbn/presentation-util-plugin/common/lib';
import { progressFunction, errors } from './progress_function';

describe('progress', () => {
  const fn = functionWrapper(progressFunction);
  const value = 0.33;

  it('returns a render as progress', () => {
    const result = fn(0.2, {}, {} as ExecutionContext);
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'progress');
  });

  it('sets the progress to context', () => {
    const result = fn(0.58, {}, {} as ExecutionContext);
    expect(result.value).toHaveProperty('value', 0.58);
  });

  it(`throws when context is outside of the valid range`, async () => {
    expect.assertions(1);
    try {
      await fn(3, {}, {} as ExecutionContext);
    } catch (e: any) {
      expect(e.message).toEqual(errors.invalidValue(3).message);
    }
  });

  describe('args', () => {
    describe('shape', () => {
      it('sets the progress element shape', () => {
        const result = fn(
          value,
          {
            shape: 'wheel',
          },
          {} as ExecutionContext
        );
        expect(result.value).toHaveProperty('shape', 'wheel');
      });

      it(`defaults to 'gauge'`, () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('shape', 'gauge');
      });
    });

    describe('max', () => {
      it('sets the maximum value', () => {
        const result = fn(
          value,
          {
            max: 2,
          },
          {} as ExecutionContext
        );
        expect(result.value).toHaveProperty('max', 2);
      });

      it('defaults to 1', () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('max', 1);
      });

      it('throws if max <= 0', async () => {
        expect.assertions(1);
        try {
          await fn(value, { max: -0.5 }, {} as ExecutionContext);
        } catch (e: any) {
          expect(e.message).toEqual(errors.invalidMaxValue(-0.5).message);
        }
      });
    });

    describe('valueColor', () => {
      it('sets the color of the progress bar', () => {
        const result = fn(
          value,
          {
            valueColor: '#000000',
          },
          {} as ExecutionContext
        );
        expect(result.value).toHaveProperty('valueColor', '#000000');
      });

      it(`defaults to '#1785b0'`, () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('valueColor', '#1785b0');
      });
    });

    describe('barColor', () => {
      it('sets the color of the background bar', () => {
        const result = fn(
          value,
          {
            barColor: '#FFFFFF',
          },
          {} as ExecutionContext
        );
        expect(result.value).toHaveProperty('barColor', '#FFFFFF');
      });

      it(`defaults to '#f0f0f0'`, () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('barColor', '#f0f0f0');
      });
    });

    describe('valueWeight', () => {
      it('sets the thickness of the bars', () => {
        const result = fn(
          value,
          {
            valuWeight: 100,
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('valuWeight', 100);
      });

      it(`defaults to 20`, () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('barWeight', 20);
      });
    });

    describe('barWeight', () => {
      it('sets the thickness of the bars', () => {
        const result = fn(
          value,
          {
            barWeight: 50,
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('barWeight', 50);
      });

      it(`defaults to 20`, () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('barWeight', 20);
      });
    });

    describe('label', () => {
      it('sets the label of the progress', () => {
        const result = fn(value, { label: 'foo' }, {} as ExecutionContext);

        expect(result.value).toHaveProperty('label', 'foo');
      });

      it('hides the label if false', () => {
        const result = fn(
          value,
          {
            label: false,
          },
          {} as ExecutionContext
        );
        expect(result.value).toHaveProperty('label', '');
      });

      it('defaults to true which sets the context as the label', () => {
        const result = fn(value, {}, {} as ExecutionContext);
        expect(result.value).toHaveProperty('label', '0.33');
      });
    });

    describe('font', () => {
      it('sets the font style for the label', () => {
        const result = fn(
          value,
          {
            font: fontStyle,
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('font');
        expect(Object.keys(result.value.font).sort()).toEqual(Object.keys(fontStyle).sort());
        expect(Object.keys(result.value.font.spec).sort()).toEqual(
          Object.keys(fontStyle.spec).sort()
        );
      });

      it('sets fill to color', () => {
        const result = fn(
          value,
          {
            font: fontStyle,
          },
          {} as ExecutionContext
        );
        expect(result.value.font.spec).toHaveProperty('fill', fontStyle.spec.color);
      });

      // TODO: write test when using an instance of the interpreter
      // it("sets a default style for the label when not provided", () => {});
    });
  });
});
