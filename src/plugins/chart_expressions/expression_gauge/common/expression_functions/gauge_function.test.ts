/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { gaugeFunction } from './gauge_function';
import { GaugeArguments, GaugeShapes } from '..';
import { functionWrapper } from '@kbn/expressions-plugin/common/expression_functions/specs/tests/utils';
import { Datatable } from '@kbn/expressions-plugin/common/expression_types/specs';
import {
  GaugeCentralMajorModes,
  GaugeColorModes,
  GaugeLabelMajorModes,
  GaugeTicksPositions,
} from '../constants';

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
        const actual = fn(context, { ...args, [arg]: option }, undefined);
        expect(actual).toMatchSnapshot();
      });
    });
  };

  checkArg('shape', GaugeShapes);
  checkArg('colorMode', GaugeColorModes);
  checkArg('ticksPosition', GaugeTicksPositions);
  checkArg('labelMajorMode', GaugeLabelMajorModes);

  it(`returns an object with the correct structure for the circle if centralMajor and centralMajorMode are passed`, () => {
    const actual = fn(
      context,
      {
        ...args,
        shape: GaugeShapes.CIRCLE,
        centralMajor: 'Some label',
        centralMajorMode: GaugeCentralMajorModes.CUSTOM,
      },
      undefined
    );
    expect(actual).toMatchSnapshot();
  });

  it(`returns an object with the correct structure for the arc if centralMajor and centralMajorMode are passed`, () => {
    const actual = fn(
      context,
      {
        ...args,
        shape: GaugeShapes.ARC,
        centralMajor: 'Some label',
        centralMajorMode: GaugeCentralMajorModes.CUSTOM,
      },
      undefined
    );
    expect(actual).toMatchSnapshot();
  });

  it(`throws error if centralMajor or centralMajorMode are provided for the horizontalBullet shape`, () => {
    const actual = () =>
      fn(
        context,
        { ...args, centralMajor: 'Some label', centralMajorMode: GaugeCentralMajorModes.CUSTOM },
        undefined
      );
    expect(actual).toThrowErrorMatchingSnapshot();
  });

  it(`throws error if centralMajor or centralMajorMode are provided for the vertical shape`, () => {
    const actual = () =>
      fn(
        context,
        {
          ...args,
          shape: GaugeShapes.VERTICAL_BULLET,
          centralMajor: 'Some label',
          centralMajorMode: GaugeCentralMajorModes.CUSTOM,
        },
        undefined
      );
    expect(actual).toThrowErrorMatchingSnapshot();
  });

  it('logs correct datatable to inspector', async () => {
    let loggedTable: Datatable;
    const handlers = {
      inspectorAdapters: {
        tables: {
          logDatatable: (name: string, datatable: Datatable) => {
            loggedTable = datatable;
          },
        },
      },
    };
    await fn(context, args, handlers as any);

    expect(loggedTable!).toMatchSnapshot();
  });
});
