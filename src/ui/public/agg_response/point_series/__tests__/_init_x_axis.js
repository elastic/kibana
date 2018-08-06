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

import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesInitXAxisProvider } from '../_init_x_axis';

describe('initXAxis', function () {

  let initXAxis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    initXAxis = Private(PointSeriesInitXAxisProvider);
  }));

  const baseChart = {
    aspects: {
      x: {
        aggConfig: {
          fieldFormatter: _.constant({}),
          write: _.constant({ params: {} }),
          type: {}
        },
        title: 'label'
      }
    }
  };
  const field = {};
  const indexPattern = {};

  it('sets the xAxisFormatter if the agg is not ordered', function () {
    const chart = _.cloneDeep(baseChart);
    initXAxis(chart);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.aggConfig.fieldFormatter());
  });

  it('makes the chart ordered if the agg is ordered', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x.aggConfig.type.ordered = true;
    chart.aspects.x.aggConfig.params = {
      field: field
    };
    chart.aspects.x.aggConfig.vis = {
      indexPattern: indexPattern
    };

    initXAxis(chart);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.aggConfig.fieldFormatter())
      .and.have.property('indexPattern', indexPattern)
      .and.have.property('xAxisField', field)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.not.have.property('interval');
  });

  it('reads the interval param from the x agg', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x.aggConfig.type.ordered = true;
    chart.aspects.x.aggConfig.write = _.constant({ params: { interval: 10 } });
    chart.aspects.x.aggConfig.params = {
      field: field
    };
    chart.aspects.x.aggConfig.vis = {
      indexPattern: indexPattern
    };

    initXAxis(chart);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.aggConfig.fieldFormatter())
      .and.have.property('indexPattern', indexPattern)
      .and.have.property('xAxisField', field)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.have.property('interval', 10);
  });
});
