/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';
import { generateMappingChain } from './generate_mapping_chain';
import { buildEmptyFilter } from '@kbn/es-query';

describe('filter manager utilities', () => {
  let mapping: any;
  let next: any;

  beforeEach(() => {
    mapping = sinon.stub();
    next = sinon.stub();
  });

  describe('generateMappingChain()', () => {
    test('should create a chaining function which calls the next function if the error is thrown', async () => {
      const filter = buildEmptyFilter(true);

      mapping.throws(filter);
      next.returns('good');

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      expect(result).toBe('good');
      sinon.assert.calledOnce(next);
    });

    test('should create a chaining function which DOES NOT call the next function if the result is returned', async () => {
      const filter = buildEmptyFilter(true);

      mapping.returns('good');
      next.returns('bad');

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      expect(result).toBe('good');
    });

    test('should resolve result for the mapping function', async () => {
      const filter = buildEmptyFilter(true);

      mapping.returns({ key: 'test', value: 'example' });

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      sinon.assert.notCalled(next);
      expect(result).toEqual({ key: 'test', value: 'example' });
    });

    test('should call the mapping function with the argument to the chain', async () => {
      // @ts-ignore
      const filter: Filter = { test: 'example' };

      mapping.returns({ key: 'test', value: 'example' });

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      sinon.assert.calledOnce(mapping);
      expect(mapping.args[0][0]).toEqual({ test: 'example' });
      sinon.assert.notCalled(next);
      expect(result).toEqual({ key: 'test', value: 'example' });
    });

    test('should resolve result for the next function', async () => {
      const filter = buildEmptyFilter(true);

      mapping.throws(filter);
      next.returns({ key: 'test', value: 'example' });

      const chain = generateMappingChain(mapping, next);
      const result = chain(filter);

      sinon.assert.calledOnce(mapping);
      sinon.assert.calledOnce(next);
      expect(result).toEqual({ key: 'test', value: 'example' });
    });

    test('should throw an error if no functions match', async () => {
      const filter = buildEmptyFilter(true);

      mapping.throws(filter);

      const chain = generateMappingChain(mapping);

      try {
        chain(filter);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('No mappings have been found for filter.');
      }
    });
  });
});
