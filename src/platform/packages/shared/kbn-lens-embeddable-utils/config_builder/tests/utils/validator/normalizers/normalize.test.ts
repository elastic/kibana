/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../../../types';
import type { NormalizedStates, NormalizerConfig } from './normalize';
import { ignorePaths, mergeNormalizers, normalize } from './normalize';

describe('normalize', () => {
  let states: NormalizedStates<LensAttributes>;

  beforeEach(() => {
    states = {
      original: { title: 'test' } as LensAttributes,
      transformed: { title: 'test', description: 'test' } as LensAttributes,
    };
  });

  describe('normalize', () => {
    it('should normalize only the original state', () => {
      const normalizer: NormalizerConfig<LensAttributes> = {
        original: (state) => ({ ...state, description: 'changed' }),
      };
      const normalized = normalize(normalizer)(states);

      expect(normalized.original).toEqual({ ...states.original, description: 'changed' });
      expect(normalized.transformed).toEqual(states.transformed);
    });

    it('should normalize only the transformed state', () => {
      const normalizer: NormalizerConfig<LensAttributes> = {
        transformed: (state) => ({ ...state, description: 'changed' }),
      };
      const normalized = normalize(normalizer)(states);

      expect(normalized.original).toEqual(states.original);
      expect(normalized.transformed).toEqual({ ...states.transformed, description: 'changed' });
    });

    it('should normalize both the original and transformed states', () => {
      const normalizer: NormalizerConfig<LensAttributes> = {
        original: (state) => ({ ...state, description: 'changed-original' }),
        transformed: (state) => ({ ...state, description: 'changed-transformed' }),
      };
      const normalized = normalize(normalizer)(states);

      expect(normalized.original).toEqual({ ...states.original, description: 'changed-original' });
      expect(normalized.transformed).toEqual({
        ...states.transformed,
        description: 'changed-transformed',
      });
    });

    it('should ignore paths in the original and transformed states', () => {
      const normalizer: NormalizerConfig<LensAttributes> = {
        ignore: ['title'],
      };
      const normalized = normalize(normalizer)(states);
      expect(normalized.original).toEqual({});
      expect(normalized.transformed).toEqual({
        description: 'test',
      });
    });
  });

  describe('mergeNormalizers', () => {
    it('should merge multiple normalizers', () => {
      const normalizer1: NormalizerConfig<LensAttributes> = {
        original: (state) => ({ ...state, description: 'description-1' }),
      };
      const normalizer2: NormalizerConfig<LensAttributes> = {
        original: (state) => ({ ...state, title: 'title-2' }),
      };
      const normalized = mergeNormalizers([normalizer1, normalizer2])(states);

      expect(normalized.original).toEqual({
        ...states.original,
        title: 'title-2',
        description: 'description-1',
      });
      expect(normalized.transformed).toEqual(states.transformed);
    });
    it('should merge multiple normalizers with transformed state', () => {
      const normalizer1: NormalizerConfig<LensAttributes> = {
        transformed: (state) => ({ ...state, description: 'description-1' }),
      };
      const normalizer2: NormalizerConfig<LensAttributes> = {
        transformed: (state) => ({ ...state, title: 'title-2' }),
      };
      const normalized = mergeNormalizers([normalizer1, normalizer2])(states);
      expect(normalized.original).toEqual(states.original);
      expect(normalized.transformed).toEqual({
        ...states.transformed,
        description: 'description-1',
        title: 'title-2',
      });
    });
  });

  describe('ignorePaths', () => {
    it('should ignore paths with wildcards with object paths', () => {
      const result = ignorePaths(
        {
          layers: {
            layer_0: {
              id: '0,',
              sampling: 0,
            },
            layer_1: {
              id: '1',
              sampling: 1,
            },
          },
        },
        ['layers.*.sampling']
      );
      expect(result).toEqual({
        layers: {
          layer_0: {
            id: '0,',
          },
          layer_1: {
            id: '1',
          },
        },
      });
    });

    it('should ignore paths with wildcards with array paths', () => {
      const result = ignorePaths(
        {
          layers: [
            {
              id: '0,',
              sampling: 0,
            },
            {
              id: '1',
              sampling: 1,
            },
          ],
        },
        ['layers.*.sampling']
      );
      expect(result).toEqual({
        layers: [{ id: '0,' }, { id: '1' }],
      });
    });

    it('should ignore paths with wildcards with nested array paths', () => {
      const result = ignorePaths(
        {
          layers: {
            layer_0: {
              id: '0,',
              columns: [
                {
                  id: '0 - 0',
                  test: 'test - 0',
                },
                {
                  id: '0 - 1',
                  test: 'test - 1',
                },
              ],
            },
            layer_1: {
              id: '1',
              columns: [
                {
                  id: '1 - 0',
                  test: 'test - 0',
                },
                {
                  id: '1 - 1',
                  test: 'test - 1',
                },
              ],
            },
          },
        },
        ['layers.*.columns.*.test']
      );
      expect(result).toEqual({
        layers: {
          layer_0: {
            id: '0,',
            columns: [{ id: '0 - 0' }, { id: '0 - 1' }],
          },
          layer_1: {
            id: '1',
            columns: [{ id: '1 - 0' }, { id: '1 - 1' }],
          },
        },
      });
    });
  });
});
