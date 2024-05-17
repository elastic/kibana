/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findTestSubject } from '@elastic/eui/lib/test';
import { mount, shallow } from 'enzyme';
import React from 'react';

import { SeriesParam } from '../../../../types';
import { seriesParam } from './mocks';
import { PointOptions, PointOptionsParams } from './point_options';

describe('PointOptions component', () => {
  let setChart: jest.Mock;
  let defaultProps: PointOptionsParams;
  let chart: SeriesParam;

  beforeEach(() => {
    setChart = jest.fn();
    chart = { ...seriesParam };

    defaultProps = {
      chart,
      setChart,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<PointOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should disable the dots size range if the show dots switch is off', () => {
    chart.showCircles = false;
    const comp = mount(<PointOptions {...defaultProps} />);
    const range = findTestSubject(comp, 'circlesRadius');
    expect(range.at(1).props().disabled).toBeTruthy();
  });
});
