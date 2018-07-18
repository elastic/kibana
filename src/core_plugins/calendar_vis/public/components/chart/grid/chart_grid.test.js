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
import { findDOMNode } from 'react-dom';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { ChartGrid } from './chart_grid';
import { CalendarVisConfig } from '../../../lib/calendar_vis_config';
import { defaultParams } from '../../../default_settings';
import aggResponse from '../../../__tests__/agg_response.json';

sinon.spy(ChartGrid.prototype, 'componentDidMount');

describe('ChartGrid - default', () => {

  let visConfig;
  let visData;

  beforeEach(() => {
    visConfig = new CalendarVisConfig(defaultParams);
    visData = aggResponse.rows[0];
  });

  afterEach(() => {
    visConfig = null;
    visData = null;
  });

  it('should render a full year overview chart grid', () => {
    const gridWrapper = mount(
      <ChartGrid
        type={visConfig.get('type')}
        gridConfig={visConfig.get('grid')}
        vislibData={visData}
      />
    );
    expect(ChartGrid.prototype.componentDidMount.called).toEqual(true);
    const grid = gridWrapper.instance();
    expect(findDOMNode(grid)).toMatchSnapshot();
  });

});
