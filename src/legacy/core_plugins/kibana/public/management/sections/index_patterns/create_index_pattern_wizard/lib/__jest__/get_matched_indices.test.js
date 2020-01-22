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

import { getMatchedIndices } from '../get_matched_indices';

jest.mock('../../constants', () => ({
  MAX_NUMBER_OF_MATCHING_INDICES: 6,
}));

const indices = [
  { name: 'kibana' },
  { name: 'es' },
  { name: 'logstash' },
  { name: 'packetbeat' },
  { name: 'metricbeat' },
  { name: '.kibana' },
];

const partialIndices = [{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }];

const exactIndices = [{ name: 'kibana' }, { name: '.kibana' }];

describe('getMatchedIndices', () => {
  it('should return all indices', () => {
    const {
      allIndices,
      exactMatchedIndices,
      partialMatchedIndices,
      visibleIndices,
    } = getMatchedIndices(indices, partialIndices, exactIndices, '*', true);

    expect(allIndices).toEqual([
      { name: 'kibana' },
      { name: 'es' },
      { name: 'logstash' },
      { name: 'packetbeat' },
      { name: 'metricbeat' },
      { name: '.kibana' },
    ]);

    expect(exactMatchedIndices).toEqual([{ name: 'kibana' }, { name: '.kibana' }]);

    expect(partialMatchedIndices).toEqual([
      { name: 'kibana' },
      { name: 'es' },
      { name: '.kibana' },
    ]);

    expect(visibleIndices).toEqual([{ name: 'kibana' }, { name: '.kibana' }]);
  });

  it('should return all indices except for system indices', () => {
    const {
      allIndices,
      exactMatchedIndices,
      partialMatchedIndices,
      visibleIndices,
    } = getMatchedIndices(indices, partialIndices, exactIndices, '*', false);

    expect(allIndices).toEqual([
      { name: 'kibana' },
      { name: 'es' },
      { name: 'logstash' },
      { name: 'packetbeat' },
      { name: 'metricbeat' },
    ]);

    expect(exactMatchedIndices).toEqual([{ name: 'kibana' }]);

    expect(partialMatchedIndices).toEqual([{ name: 'kibana' }, { name: 'es' }]);

    expect(visibleIndices).toEqual([{ name: 'kibana' }]);
  });

  it('should return partial matches as visible if there are no exact', () => {
    const { visibleIndices } = getMatchedIndices(indices, partialIndices, [], '*', true);

    expect(visibleIndices).toEqual([{ name: 'kibana' }, { name: 'es' }, { name: '.kibana' }]);
  });

  it('should return all indices as visible if there are no exact or partial', () => {
    const { visibleIndices } = getMatchedIndices(indices, [], [], '*', true);

    expect(visibleIndices).toEqual(indices);
  });
});
