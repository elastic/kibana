/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest, ElasticsearchClient } from '@kbn/core/server';

import { coreMock } from '@kbn/core/server/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/server/mocks';
import { BucketAggType, getAggTypes, MetricAggType } from '../../../common';
import { createFieldFormatsStartMock } from '@kbn/field-formats-plugin/server/mocks';
import { createIndexPatternsStartMock } from '../../data_views/mocks';

import { AggsService, AggsSetupDependencies, AggsStartDependencies } from './aggs_service';

const { savedObjects, uiSettings } = coreMock.createStart();

describe('AggsService - server', () => {
  let service: AggsService;
  let setupDeps: AggsSetupDependencies;
  let startDeps: AggsStartDependencies;

  beforeEach(() => {
    service = new AggsService();
    setupDeps = {
      registerFunction: expressionsPluginMock.createSetupContract().registerFunction,
    };
    startDeps = {
      fieldFormats: createFieldFormatsStartMock(),
      indexPatterns: createIndexPatternsStartMock(),
      uiSettings,
    };
  });

  describe('setup()', () => {
    test('exposes proper contract', () => {
      const setup = service.setup(setupDeps);
      expect(Object.keys(setup).length).toBe(1);
      expect(setup).toHaveProperty('types');
    });
  });

  describe('start()', () => {
    test('exposes proper contract', async () => {
      service.setup(setupDeps);
      const start = service.start(startDeps);

      expect(Object.keys(start).length).toBe(1);
      expect(start).toHaveProperty('asScopedToClient');

      const contract = await start.asScopedToClient(
        savedObjects.getScopedClient({} as KibanaRequest),
        {} as ElasticsearchClient
      );
      expect(contract).toHaveProperty('calculateAutoTimeExpression');
      expect(contract).toHaveProperty('createAggConfigs');
      expect(contract).toHaveProperty('types');
    });

    test('types registry returns initialized agg types', async () => {
      service.setup(setupDeps);
      const start = await service
        .start(startDeps)
        .asScopedToClient(
          savedObjects.getScopedClient({} as KibanaRequest),
          {} as ElasticsearchClient
        );

      expect(start.types.get('terms').name).toBe('terms');
    });

    test('registers default agg types', async () => {
      service.setup(setupDeps);
      const start = await service
        .start(startDeps)
        .asScopedToClient(
          savedObjects.getScopedClient({} as KibanaRequest),
          {} as ElasticsearchClient
        );

      const aggTypes = getAggTypes();
      expect(start.types.getAll().buckets.length).toBe(aggTypes.buckets.length);
      expect(start.types.getAll().metrics.length).toBe(aggTypes.metrics.length);
    });

    test('merges default agg types with types registered during setup', async () => {
      const setup = service.setup(setupDeps);
      setup.types.registerBucket(
        'foo',
        () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>)
      );
      setup.types.registerMetric(
        'bar',
        () => ({ name: 'bar', type: 'metrics' } as MetricAggType<any>)
      );

      const start = await service
        .start(startDeps)
        .asScopedToClient(
          savedObjects.getScopedClient({} as KibanaRequest),
          {} as ElasticsearchClient
        );

      const aggTypes = getAggTypes();
      expect(start.types.getAll().buckets.length).toBe(aggTypes.buckets.length + 1);
      expect(start.types.getAll().buckets.some(({ name }) => name === 'foo')).toBe(true);
      expect(start.types.getAll().metrics.length).toBe(aggTypes.metrics.length + 1);
      expect(start.types.getAll().metrics.some(({ name }) => name === 'bar')).toBe(true);
    });
  });
});
