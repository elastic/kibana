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

import React from 'react';
import { shallow } from 'enzyme';
import { LineOptions, LineOptionsParams } from './line_options';
import { NumberInputOption } from '../../common';
import { getInterpolationModes } from '../../../utils/collections';
import { seriesParam } from './mocks';

const LINE_WIDTH = 'lineWidth';
const DRAW_LINES = 'drawLinesBetweenPoints';
const interpolationModes = getInterpolationModes();

describe('LineOptions component', () => {
  let setChart: jest.Mock;
  let defaultProps: LineOptionsParams;

  beforeEach(() => {
    setChart = jest.fn();

    defaultProps = {
      chart: { ...seriesParam },
      vis: {
        type: {
          editorConfig: {
            collections: { interpolationModes },
          },
        },
      },
      setChart,
    } as any;
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
