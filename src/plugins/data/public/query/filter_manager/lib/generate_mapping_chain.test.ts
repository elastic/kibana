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

import sinon from 'sinon';
import { generateMappingChain } from './generate_mapping_chain';
import { esFilters } from '../../../../common';

describe('filter manager utilities', () => {
  let mapping: any;
  let next: any;

  beforeEach(() => {
    mapping = sinon.stub();
    next = sinon.stub();
  });

  describe('generateMappingChain()', () => {
    test('should create a chaining function which calls the next function if the error is thrown', async () => {
      const filter = esFilters.buildEmptyFilter(true);

      mapping.throws(filter);
      next.returns('good');

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      expect(result).toBe('good');
      sinon.assert.calledOnce(next);
    });

    test('should create a chaining function which DOES NOT call the next function if the result is returned', async () => {
      const filter = esFilters.buildEmptyFilter(true);

      mapping.returns('good');
      next.returns('bad');

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      expect(result).toBe('good');
    });

    test('should resolve result for the mapping function', async () => {
      const filter = esFilters.buildEmptyFilter(true);

      mapping.returns({ key: 'test', value: 'example' });

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      sinon.assert.notCalled(next);
      expect(result).toEqual({ key: 'test', value: 'example' });
    });

    test('should call the mapping function with the argument to the chain', async () => {
      // @ts-ignore
      const filter: esFilters.Filter = { test: 'example' };

      mapping.returns({ key: 'test', value: 'example' });

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      sinon.assert.calledOnce(mapping);
      expect(mapping.args[0][0]).toEqual({ test: 'example' });
      sinon.assert.notCalled(next);
      expect(result).toEqual({ key: 'test', value: 'example' });
    });

    test('should resolve result for the next function', async () => {
      const filter = esFilters.buildEmptyFilter(true);

      mapping.throws(filter);
      next.returns({ key: 'test', value: 'example' });

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      sinon.assert.calledOnce(mapping);
      sinon.assert.calledOnce(next);
      expect(result).toEqual({ key: 'test', value: 'example' });
    });

    test('should throw an error if no functions match', async done => {
      const filter = esFilters.buildEmptyFilter(true);

      mapping.throws(filter);

      const chain = generateMappingChain(mapping);

      try {
        chain(filter);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('No mappings have been found for filter.');
        done();
      }
    });
  });
});
