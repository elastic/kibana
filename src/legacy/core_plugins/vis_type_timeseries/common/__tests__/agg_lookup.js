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
import { createOptions, isBasicAgg } from '../agg_lookup';

describe('aggLookup', () => {
  describe('isBasicAgg(metric)', () => {
    it('returns true for a basic metric (count)', () => {
      expect(isBasicAgg({ type: 'count' })).to.equal(true);
    });
    it('returns false for a pipeline metric (derivative)', () => {
      expect(isBasicAgg({ type: 'derivative' })).to.equal(false);
    });
  });

  describe('createOptions(type, siblings)', () => {
    it('returns options for all aggs', () => {
      const options = createOptions();
      expect(options).to.have.length(30);
      options.forEach(option => {
        expect(option).to.have.property('label');
        expect(option).to.have.property('value');
        expect(option).to.have.property('disabled');
      });
    });

    it('returns options for basic', () => {
      const options = createOptions('basic');
      expect(options).to.have.length(15);
      expect(options.every(opt => isBasicAgg({ type: opt.value }))).to.equal(true);
    });

    it('returns options for pipeline', () => {
      const options = createOptions('pipeline');
      expect(options).to.have.length(15);
      expect(options.every(opt => !isBasicAgg({ type: opt.value }))).to.equal(true);
    });

    it('returns options for all if given unknown key', () => {
      const options = createOptions('foo');
      expect(options).to.have.length(30);
    });
  });
});
