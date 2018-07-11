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
import sinon from 'sinon';
import { CalendarChart } from './calendar_chart';
import { CalendarVisConfig } from '../../lib';
import { defaultParams } from '../../default_settings';
import aggResponse from '../../__tests__/agg_response.json';

describe('CalendarChart', () => {

  let visConfig;
  let visData;

  beforeAll(() => {
    visConfig = new CalendarVisConfig(defaultParams);
    visData = aggResponse.rows[0];
  });

  afterAll(() => {
    visConfig = null;
    visData = null;
  });

  it('should render a chart with two category axes, one grid and a title', () => {
    const renderComplete = jest.fn();
    sinon.spy(CalendarChart.prototype, 'componentDidMount');
    const chartWrapper = shallow(<CalendarChart
      id={`chart_${visData.label.slice(0, 4)}`}
      visConfig={visConfig}
      vislibData={visData}
      renderComplete={renderComplete}
    />);
    expect(renderComplete.mock.calls.length).toBe(1);
    expect(CalendarChart.prototype.componentDidMount.calledOnce).toEqual(true);
    expect(chartWrapper).toMatchSnapshot();
  });
});
