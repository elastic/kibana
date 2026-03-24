/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../../transforms/columns/utils';
import type { RegionMapState } from './region_map';
import { regionMapStateSchema } from './region_map';

type DefaultRegionMapConfig = Pick<RegionMapState, 'sampling' | 'ignore_global_filters'>;
type RegionMapWithoutDefaultsConfig = Omit<RegionMapState, 'sampling' | 'ignore_global_filters'>;

type RegionTerms = Extract<RegionMapState['region'], { operation: 'terms' }>;
interface RegionMapTermsRegionBaseConfig {
  region: Omit<RegionTerms, 'size'>;
}

describe('Region Map Schema', () => {
  const baseRegionMapConfig: Omit<RegionMapWithoutDefaultsConfig, 'metric' | 'region'> = {
    type: 'region_map',
    dataset: {
      type: 'dataView',
      id: 'test-data-view',
    },
  };

  const defaultValues: DefaultRegionMapConfig = {
    sampling: 1,
    ignore_global_filters: false,
  };

  describe('basic configuration', () => {
    it('validates count metric operation and terms region operation', () => {
      const input: Omit<RegionMapWithoutDefaultsConfig, 'region'> & RegionMapTermsRegionBaseConfig =
        {
          ...baseRegionMapConfig,
          metric: {
            operation: 'count',
            field: 'test_field',
            empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
          },
          region: {
            operation: 'terms',
            fields: ['location'],
          },
        };

      const validated = regionMapStateSchema.validate(input);
      expect(validated).toEqual({
        ...defaultValues,
        ...input,
        region: { ...input.region, size: 5 },
      });
    });

    it('validates average metric operation and filters region operation', () => {
      const input: RegionMapWithoutDefaultsConfig = {
        ...baseRegionMapConfig,
        metric: {
          operation: 'average',
          field: 'bytes',
        },
        region: {
          operation: 'filters',
          filters: [
            {
              filter: {
                language: 'kuery',
                query: 'location: "US"',
              },
              label: 'US',
            },
          ],
        },
      };

      const validated = regionMapStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('region configuration', () => {
    it('validates with ems boundaries and join', () => {
      const input: RegionMapWithoutDefaultsConfig = {
        ...baseRegionMapConfig,
        metric: {
          operation: 'average',
          field: 'bytes',
        },
        region: {
          operation: 'terms',
          fields: ['location'],
          size: 5,
          ems: {
            boundaries: 'world_countries',
            join: 'iso',
          },
        },
      };

      const validated = regionMapStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });

  describe('validation errors', () => {
    it('throws on missing metric operation', () => {
      const input: Omit<RegionMapWithoutDefaultsConfig, 'metric'> & {
        metric: { field: string };
      } = {
        ...baseRegionMapConfig,
        metric: {
          field: 'test_field',
        },
        region: {
          operation: 'filters',
          filters: [
            {
              filter: {
                language: 'kuery',
                query: 'location: "US"',
              },
              label: 'US',
            },
          ],
        },
      };

      expect(() => regionMapStateSchema.validate(input)).toThrow();
    });

    it('throws on missing region operation', () => {
      const input: Omit<RegionMapWithoutDefaultsConfig, 'region'> & {
        region: { fields: string[] };
      } = {
        ...baseRegionMapConfig,
        metric: {
          operation: 'count',
          field: 'test_field',
          empty_as_null: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
        },
        region: {
          fields: ['location'],
        },
      };
      expect(() => regionMapStateSchema.validate(input)).toThrow();
    });

    it('throws on missing ems join field', () => {
      const input: Omit<RegionMapWithoutDefaultsConfig, 'region'> & {
        region: { operation: 'terms'; fields: string[]; size: number; ems: { boundaries: string } };
      } = {
        ...baseRegionMapConfig,
        metric: {
          operation: 'average',
          field: 'bytes',
        },
        region: {
          operation: 'terms',
          fields: ['location'],
          size: 5,
          ems: {
            boundaries: 'world_countries',
          },
        },
      };

      expect(() => regionMapStateSchema.validate(input)).toThrow();
    });

    it('throw when using term buckets operation in an esql configuration', () => {
      const input: RegionMapWithoutDefaultsConfig = {
        type: 'region_map',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'count',
        },
        region: {
          operation: 'terms',
          fields: ['category'],
          size: 5,
        },
      };
      expect(() => regionMapStateSchema.validate(input)).toThrow();
    });
  });

  describe('complex configurations', () => {
    it('validates full region map configuration', () => {
      const input: RegionMapWithoutDefaultsConfig = {
        ...baseRegionMapConfig,
        title: 'Region map',
        description: 'Top 10 countries by average bytes',
        metric: {
          operation: 'average',
          field: 'bytes',
        },
        region: {
          operation: 'terms',
          fields: ['geo.dest'],
          size: 10,
          ems: {
            boundaries: 'world_countries',
            join: 'iso-code2',
          },
        },
      };

      const validated = regionMapStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });

    it('validates esql configuration', () => {
      const input: RegionMapWithoutDefaultsConfig = {
        type: 'region_map',
        title: 'Region map',
        description: 'Top 10 countries by average bytes',
        dataset: {
          type: 'esql',
          query: 'FROM my-index | LIMIT 100',
        },
        metric: {
          operation: 'value',
          column: 'avg_bytes',
        },
        region: {
          operation: 'value',
          column: 'location',
          ems: {
            boundaries: 'world_countries',
            join: 'iso-code2',
          },
        },
      };

      const validated = regionMapStateSchema.validate(input);
      expect(validated).toEqual({ ...defaultValues, ...input });
    });
  });
});
