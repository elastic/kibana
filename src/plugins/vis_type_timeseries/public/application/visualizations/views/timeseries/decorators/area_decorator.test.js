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
      stackAsPercentage: false,
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
