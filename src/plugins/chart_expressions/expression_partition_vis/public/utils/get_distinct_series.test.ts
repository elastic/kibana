/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDistinctSeries } from './get_distinct_series';
import { createMockVisData, createMockBucketColumns } from '../mocks';

const visData = createMockVisData();
const buckets = createMockBucketColumns();

describe('getDistinctSeries', () => {
  it('should return the distinct values for all buckets', () => {
    const { allSeries } = getDistinctSeries(visData.rows, buckets);
    expect(allSeries).toEqual(['Logstash Airways', 'JetBeats', 'ES-Air', 'Kibana Airlines', 0, 1]);
  });

  it('should return only the distinct values for the parent bucket', () => {
    const { parentSeries } = getDistinctSeries(visData.rows, buckets);
    expect(parentSeries).toEqual(['Logstash Airways', 'JetBeats', 'ES-Air', 'Kibana Airlines']);
  });

  it('should return empty array for empty buckets', () => {
    const { parentSeries } = getDistinctSeries(visData.rows, [{ name: 'Count' }]);
    expect(parentSeries.length).toEqual(0);
  });
});
