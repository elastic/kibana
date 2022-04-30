/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getMatchedIndices } from './get_matched_indices';
import { Tag, MatchedItem } from '../types';

jest.mock('./../constants', () => ({
  MAX_NUMBER_OF_MATCHING_INDICES: 6,
}));

const tags: Tag[] = [];
const indices = [
  { name: 'kibana', tags },
  { name: 'es', tags },
  { name: 'logstash', tags },
  { name: 'packetbeat', tags },
  { name: 'metricbeat', tags },
  { name: '.kibana', tags },
] as MatchedItem[];

const partialIndices = [
  { name: 'kibana', tags },
  { name: 'es', tags },
  { name: '.kibana', tags },
] as MatchedItem[];

const exactIndices = [
  { name: 'kibana', tags },
  { name: '.kibana', tags },
] as MatchedItem[];

describe('getMatchedIndices', () => {
  it('should return all indices', () => {
    const { allIndices, exactMatchedIndices, partialMatchedIndices, visibleIndices } =
      getMatchedIndices(indices, partialIndices, exactIndices, true);

    expect(allIndices).toEqual([
      { name: 'kibana', tags },
      { name: 'es', tags },
      { name: 'logstash', tags },
      { name: 'packetbeat', tags },
      { name: 'metricbeat', tags },
      { name: '.kibana', tags },
    ]);

    expect(exactMatchedIndices).toEqual([
      { name: 'kibana', tags },
      { name: '.kibana', tags },
    ]);

    expect(partialMatchedIndices).toEqual([
      { name: 'kibana', tags },
      { name: 'es', tags },
      { name: '.kibana', tags },
    ]);

    expect(visibleIndices).toEqual([
      { name: 'kibana', tags },
      { name: '.kibana', tags },
    ]);
  });

  it('should return all indices except for system indices', () => {
    const { allIndices, exactMatchedIndices, partialMatchedIndices, visibleIndices } =
      getMatchedIndices(indices, partialIndices, exactIndices, false);

    expect(allIndices).toEqual([
      { name: 'kibana', tags },
      { name: 'es', tags },
      { name: 'logstash', tags },
      { name: 'packetbeat', tags },
      { name: 'metricbeat', tags },
    ]);

    expect(exactMatchedIndices).toEqual([{ name: 'kibana', tags }]);

    expect(partialMatchedIndices).toEqual([
      { name: 'kibana', tags },
      { name: 'es', tags },
    ]);

    expect(visibleIndices).toEqual([{ name: 'kibana', tags }]);
  });

  it('should return partial matches as visible if there are no exact', () => {
    const { visibleIndices } = getMatchedIndices(indices, partialIndices, [], true);

    expect(visibleIndices).toEqual([
      { name: 'kibana', tags },
      { name: 'es', tags },
      { name: '.kibana', tags },
    ]);
  });

  it('should return all indices as visible if there are no exact or partial', () => {
    const { visibleIndices } = getMatchedIndices(indices, [], [], true);

    expect(visibleIndices).toEqual(indices);
  });
});
