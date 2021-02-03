/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { AreaSeriesDecorator } from './area_decorator';

describe('src/legacy/core_plugins/metrics/public/visualizations/views/timeseries/decorators/area_decorator.js', () => {
  let props;

  beforeEach(() => {
    props = {
      lines: {
        fill: 1,
        lineWidth: 2,
        show: true,
        steps: false,
      },
      points: {
        lineWidth: 5,
        radius: 1,
        show: false,
      },
      color: 'rgb(0, 156, 224)',
      data: [
        [1556917200000, 7],
        [1557003600000, 9],
      ],
      hideInLegend: false,
      stackMode: undefined,
      seriesId: '61ca57f1-469d-11e7-af02-69e470af7417:Rome',
      seriesGroupId: 'yaxis_main_group',
      name: 'Rome',
      stack: false,
      timeZone: 'local',
      enableHistogramMode: true,
    };
  });

  describe('<AreaSeriesDecorator />', () => {
    test('should render and match a snapshot', () => {
      const wrapper = shallow(<AreaSeriesDecorator {...props} />);

      expect(wrapper).toMatchSnapshot();
    });
  });
});
