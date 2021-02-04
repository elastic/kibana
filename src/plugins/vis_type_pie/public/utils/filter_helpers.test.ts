/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFilterClickData, getFilterEventData } from './filter_helpers';
import { createMockBucketColumns, createMockVisData } from '../mocks';

const bucketColumns = createMockBucketColumns();
const visData = createMockVisData();

describe('getFilterClickData', () => {
  it('returns the correct filter data for the specific layer', () => {
    const clickedLayers = [
      {
        groupByRollup: 'Logstash Airways',
        value: 729,
      },
    ];
    const data = getFilterClickData(clickedLayers, bucketColumns, visData);
    expect(data.length).toEqual(clickedLayers.length);
    expect(data[0].value).toEqual('Logstash Airways');
    expect(data[0].row).toEqual(0);
    expect(data[0].column).toEqual(0);
  });

  it('changes the filter if the user clicks on another layer', () => {
    const clickedLayers = [
      {
        groupByRollup: 'ES-Air',
        value: 572,
      },
    ];
    const data = getFilterClickData(clickedLayers, bucketColumns, visData);
    expect(data.length).toEqual(clickedLayers.length);
    expect(data[0].value).toEqual('ES-Air');
    expect(data[0].row).toEqual(4);
    expect(data[0].column).toEqual(0);
  });
});

describe('getFilterEventData', () => {
  it('returns the correct filter data for the specific series', () => {
    const series = {
      key: 'Kibana Airlines',
      specId: 'pie',
    };
    const data = getFilterEventData(visData, series);
    expect(data[0].value).toEqual('Kibana Airlines');
    expect(data[0].row).toEqual(6);
    expect(data[0].column).toEqual(0);
  });

  it('changes the filter if the user clicks on another series', () => {
    const series = {
      key: 'JetBeats',
      specId: 'pie',
    };
    const data = getFilterEventData(visData, series);
    expect(data[0].value).toEqual('JetBeats');
    expect(data[0].row).toEqual(2);
    expect(data[0].column).toEqual(0);
  });
});
