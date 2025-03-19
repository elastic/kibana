/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import $ from 'jquery';

import { pointSeriesTooltipFormatter } from './_pointseries_tooltip_formatter';

describe('tooltipFormatter', function () {
  const tooltipFormatter = pointSeriesTooltipFormatter();

  function cell($row, i) {
    return $row.eq(i).text().trim();
  }

  const baseEvent = {
    data: {
      xAxisLabel: 'inner',
      xAxisFormatter: _.identity,
      yAxisLabel: 'middle',
      yAxisFormatter: _.identity,
      zAxisLabel: 'top',
      zAxisFormatter: _.identity,
      series: [
        {
          rawId: '1',
          label: 'middle',
          zLabel: 'top',
          yAxisFormatter: _.identity,
          zAxisFormatter: _.identity,
        },
      ],
    },
    datum: {
      x: 3,
      y: 2,
      z: 1,
      extraMetrics: [],
      seriesId: '1',
    },
    config: {
      get: (name) => {
        const config = {
          setColorRange: false,
          gauge: false,
          percentageMode: false,
        };
        return config[name];
      },
    },
    handler: {
      pointSeries: {
        getSeries: () => ({
          getValueAxis: () => ({
            getScale: () => ({
              domain: () => [0, 10],
            }),
          }),
        }),
      },
    },
  };

  const uiSettings = {
    get: () => '',
  };

  it('returns html based on the mouse event', function () {
    const event = _.cloneDeep(baseEvent);
    const $el = $(tooltipFormatter(event, uiSettings));
    const $rows = $el.find('tr');
    expect($rows.length).toBe(3);

    const $row1 = $rows.eq(0).find('td');
    expect(cell($row1, 0)).toBe('inner');
    expect(cell($row1, 1)).toBe('3');

    const $row2 = $rows.eq(1).find('td');
    expect(cell($row2, 0)).toBe('middle');
    expect(cell($row2, 1)).toBe('2');

    const $row3 = $rows.eq(2).find('td');
    expect(cell($row3, 0)).toBe('top');
    expect(cell($row3, 1)).toBe('1');
  });

  it('renders correctly on missing extraMetrics in datum', function () {
    const event = _.cloneDeep(baseEvent);
    delete event.datum.extraMetrics;
    const $el = $(tooltipFormatter(event, uiSettings));
    const $rows = $el.find('tr');
    expect($rows.length).toBe(3);
  });

  it('renders correctly for gauge/goal visualizations', function () {
    const event = _.cloneDeep(baseEvent);
    let type = 'gauge';
    event.config.get = (name) => {
      const config = {
        setColorRange: false,
        gauge: false,
        percentageMode: false,
        type,
      };
      return config[name];
    };

    let $el = $(tooltipFormatter(event, uiSettings));
    let $rows = $el.find('tr');
    expect($rows.length).toBe(2);

    type = 'goal';
    $el = $(tooltipFormatter(event, uiSettings));
    $rows = $el.find('tr');
    expect($rows.length).toBe(2);
  });
});
