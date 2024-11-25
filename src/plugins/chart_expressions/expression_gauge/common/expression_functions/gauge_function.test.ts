/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gaugeFunction } from './gauge_function';
import { GaugeArguments, GaugeShapes } from '..';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import {
  EXPRESSION_GAUGE_NAME,
  GaugeCentralMajorModes,
  GaugeColorModes,
  GaugeLabelMajorModes,
  GaugeTicksPositions,
} from '../constants';
import { ExecutionContext } from '@kbn/expressions-plugin/common';

describe('interpreter/functions#gauge', () => {
  const fn = functionWrapper(gaugeFunction());
  const context: Datatable = {
    type: 'datatable',
    rows: [{ 'col-0-1': 0 }],
    columns: [
      { id: 'col-0-1', name: 'Count', meta: { type: 'number' } },
      { id: 'col-1-2', name: 'Dest', meta: { type: 'string' } },
    ],
  };
  const args: GaugeArguments = {
    ticksPosition: GaugeTicksPositions.AUTO,
    labelMajorMode: GaugeLabelMajorModes.CUSTOM,
    labelMajor: 'title',
    shape: GaugeShapes.HORIZONTAL_BULLET,
    colorMode: GaugeColorModes.NONE,
    min: 'col-1-2',
    metric: 'col-0-1',
  };
  const checkArg = (arg: keyof GaugeArguments, options: Record<string, string>) => {
    Object.values(options).forEach((option) => {
      it(`returns an object with the correct structure for the ${option} ${arg}`, () => {
        const actual = fn(context, { ...args, [arg]: option });
        expect(actual).toMatchSnapshot();
      });
    });
  };

  checkArg('shape', GaugeShapes);
  checkArg('colorMode', GaugeColorModes);
  checkArg('ticksPosition', GaugeTicksPositions);
  checkArg('labelMajorMode', GaugeLabelMajorModes);

  it(`returns an object with the correct structure for the circle if centralMajor and centralMajorMode are passed`, () => {
    const actual = fn(context, {
      ...args,
      shape: GaugeShapes.CIRCLE,
      centralMajor: 'Some label',
      centralMajorMode: GaugeCentralMajorModes.CUSTOM,
    });
    expect(actual).toMatchSnapshot();
  });

  it(`returns an object with the correct structure for the arc if centralMajor and centralMajorMode are passed`, () => {
    const actual = fn(context, {
      ...args,
      shape: GaugeShapes.SEMI_CIRCLE,
      centralMajor: 'Some label',
      centralMajorMode: GaugeCentralMajorModes.CUSTOM,
    });
    expect(actual).toMatchSnapshot();
  });

  it('logs correct datatable to inspector', async () => {
    let loggedTable: Datatable;
    const handlers = {
      inspectorAdapters: {
        tables: {
          logDatatable: (name: string, datatable: Datatable) => {
            loggedTable = datatable;
          },
          reset: () => {},
        },
      },
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;

    await fn(context, args, handlers);

    expect(loggedTable!).toMatchSnapshot();
  });

  it('should pass over overrides from variables', async () => {
    const overrides = {
      settings: {
        onBrushEnd: 'ignore',
      },
    };
    const handlers = {
      variables: { overrides },
      getExecutionContext: jest.fn(),
    } as unknown as ExecutionContext;
    const result = await fn(context, args, handlers);

    expect(result).toEqual({
      type: 'render',
      as: EXPRESSION_GAUGE_NAME,
      value: expect.objectContaining({ overrides }),
    });
  });
});
