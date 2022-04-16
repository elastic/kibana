/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from '@kbn/expressions-plugin';
import { functionWrapper, fontStyle } from '@kbn/presentation-util-plugin/common/lib';
import { metricFunction } from './metric_function';

describe('metric', () => {
  const fn = functionWrapper(metricFunction);

  it('returns a render as metric', () => {
    const result = fn(null, {}, {} as ExecutionContext);
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'metric');
  });

  it('sets the metric to context', () => {
    const result = fn('2', {}, {} as ExecutionContext);
    expect(result.value).toHaveProperty('metric', '2');
  });

  it(`defaults metric to '?' when context is missing`, () => {
    const result = fn(null, {}, {} as ExecutionContext);
    expect(result.value).toHaveProperty('metric', '?');
  });

  describe('args', () => {
    describe('label', () => {
      it('sets the label of the metric', () => {
        const result = fn(
          null,
          {
            label: 'My Label',
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('label', 'My Label');
      });
    });

    describe('metricFont', () => {
      it('sets the font style for the metric', () => {
        const result = fn(
          null,
          {
            metricFont: fontStyle,
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('metricFont', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("sets a default style for the metric when not provided, () => {});
    });

    describe('labelFont', () => {
      it('sets the font style for the label', () => {
        const result = fn(
          null,
          {
            labelFont: fontStyle,
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('labelFont', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("sets a default style for the label when not provided, () => {});
    });

    describe('metricFormat', () => {
      it('sets the number format of the metric value', () => {
        const result = fn(
          null,
          {
            metricFormat: '0.0%',
          },
          {} as ExecutionContext
        );

        expect(result.value).toHaveProperty('metricFormat', '0.0%');
      });
    });
  });
});
