/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { NumberInputOption } from '@kbn/vis-default-editor-plugin/public';

import { LineOptions, LineOptionsParams } from './line_options';
import { seriesParam } from './mocks';

const LINE_WIDTH = 'lineWidth';
const DRAW_LINES = 'drawLinesBetweenPoints';

describe('LineOptions component', () => {
  let setChart: jest.Mock;
  let defaultProps: LineOptionsParams;

  beforeEach(() => {
    setChart = jest.fn();

    defaultProps = {
      chart: { ...seriesParam },
      setChart,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<LineOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should set lineWidth as undefined when empty value', () => {
    const comp = shallow(<LineOptions {...defaultProps} />);
    comp.find(NumberInputOption).prop('setValue')(LINE_WIDTH, '');

    expect(setChart).toBeCalledWith(LINE_WIDTH, undefined);
  });

  it('should set lineWidth value', () => {
    const comp = shallow(<LineOptions {...defaultProps} />);
    comp.find(NumberInputOption).prop('setValue')(LINE_WIDTH, 5);

    expect(setChart).toBeCalledWith(LINE_WIDTH, 5);
  });

  it('should set drawLinesBetweenPoints', () => {
    const comp = shallow(<LineOptions {...defaultProps} />);
    comp.find({ paramName: DRAW_LINES }).prop('setValue')(DRAW_LINES, false);

    expect(setChart).toBeCalledWith(DRAW_LINES, false);
  });
});
