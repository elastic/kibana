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

import { expect } from 'chai';
import _ from 'lodash';
import ngMock from 'ng_mock';
import aggResponse from '../agg_response.json';
import colorMap from '../colormap.json';
import { calendarDataObjectProvider } from '../../lib/data_object/calendar_data';
import 'ui/persisted_state';

describe('Calendar Data Object', () => {

  let DataObject;
  let persistedState;
  let data;
  let visData;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    visData = aggResponse;
    DataObject = calendarDataObjectProvider($injector.get('config'));
    persistedState = new ($injector.get('PersistedState'))();
    data = new DataObject(visData, persistedState);
  }));

  afterEach(() => {
    visData = null;
    DataObject = null;
    persistedState = null;
    data = null;
  });

  it('should get a correct colorization function', () => {
    persistedState.set('vis.defaultColors', colorMap);
    const color = data.getColorFunc();
    expect(_.isFunction(color)).to.equal(true);
  });

  it('should return a correct chart data format', () => {
    const chartData = data.chartData();
    expect(Array.isArray(chartData)).to.equal(true);
  });

});
