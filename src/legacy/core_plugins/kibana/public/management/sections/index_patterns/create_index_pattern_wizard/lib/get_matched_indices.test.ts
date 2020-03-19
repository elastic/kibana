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

import { getMatchedIndices } from './get_matched_indices';
import { Tag } from '../types';

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
];

const partialIndices = [
  { name: 'kibana', tags },
  { name: 'es', tags },
  { name: '.kibana', tags },
];

const exactIndices = [
  { name: 'kibana', tags },
  { name: '.kibana', tags },
];

describe('getMatchedIndices', () => {
  it('should return all indices', () => {
    const {
      allIndices,
      exactMatchedIndices,
      partialMatchedIndices,
      visibleIndices,
    } = getMatchedIndices(indices, partialIndices, exactIndices, true);

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
    const {
      allIndices,
      exactMatchedIndices,
      partialMatchedIndices,
      visibleIndices,
    } = getMatchedIndices(indices, partialIndices, exactIndices, false);

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
