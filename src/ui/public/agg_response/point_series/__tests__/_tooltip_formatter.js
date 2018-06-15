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
import $ from 'jquery';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesTooltipFormatter } from '../_tooltip_formatter';

describe('tooltipFormatter', function () {

  let tooltipFormatter;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    tooltipFormatter = Private(PointSeriesTooltipFormatter);
  }));

  function agg(name) {
    return {
      fieldFormatter: _.constant(function (v) { return '(' + v + ')'; }),
      makeLabel: _.constant(name)
    };
  }

  function cell($row, i) {
    return $row.eq(i).text().trim();
  }

  const baseEvent = {
    datum: {
      aggConfigResult: {
        aggConfig: agg('inner'),
        value: 3,
        $parent: {
          aggConfig: agg('middle'),
          value: 2,
          $parent: {
            aggConfig: agg('top'),
            value: 1
          }
        }
      },
      extraMetrics: []
    }
  };

  it('returns html based on the mouse event', function () {
    const event = _.cloneDeep(baseEvent);
    const $el = $(tooltipFormatter(event));
    const $rows = $el.find('tr');
    expect($rows.length).to.be(3);

    const $row1 = $rows.eq(0).find('td');
    expect(cell($row1, 0)).to.be('inner');
    expect(cell($row1, 1)).to.be('(3)');

    const $row2 = $rows.eq(1).find('td');
    expect(cell($row2, 0)).to.be('middle');
    expect(cell($row2, 1)).to.be('(2)');

    const $row3 = $rows.eq(2).find('td');
    expect(cell($row3, 0)).to.be('top');
    expect(cell($row3, 1)).to.be('(1)');
  });
});
