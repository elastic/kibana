/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Subscription } from 'rxjs';

import { coreMock } from '../../../../../core/public/mocks';
import { expressionsPluginMock } from '../../../../../plugins/expressions/public/mocks';
import { BucketAggType, getAggTypes, MetricAggType } from '../../../common';
import { fieldFormatsServiceMock } from '../../../../field_formats/public/mocks';
import { dataPluginMock } from '../../mocks';

import {
  AggsService,
  AggsSetupDependencies,
  AggsStartDependencies,
  createGetConfig,
} from './aggs_service';
import { createNowProviderMock } from '../../now_provider/mocks';

const { uiSettings } = coreMock.createSetup();

describe('AggsService - public', () => {
  let service: AggsService;
  let setupDeps: AggsSetupDependencies;
  let startDeps: AggsStartDependencies;

  beforeEach(() => {
    service = new AggsService();
    setupDeps = {
      registerFunction: expressionsPluginMock.createSetupContract().registerFunction,
      uiSettings,
      nowProvider: createNowProviderMock(),
    };
    startDeps = {
      fieldFormats: fieldFormatsServiceMock.createStartContract(),
      indexPatterns: dataPluginMock.createStartContract().indexPatterns,
      uiSettings,
    };
  });

  describe('setup()', () => {
    test('exposes proper contract', () => {
      const setup = service.setup(setupDeps);
      expect(Object.keys(setup).length).toBe(1);
      expect(setup).toHaveProperty('types');
    });

    test('registers default agg types', () => {
      service.setup(setupDeps);
      const start = service.start(startDeps);
      expect(start.types.getAll().buckets.length).toBe(16);
      expect(start.types.getAll().metrics.length).toBe(24);
    });

    test('registers custom agg types', () => {
      const setup = service.setup(setupDeps);
      setup.types.registerBucket(
        'foo',
        () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>)
      );
      setup.types.registerMetric(
        'bar',
        () => ({ name: 'bar', type: 'metrics' } as MetricAggType<any>)
      );

      const start = service.start(startDeps);
      expect(start.types.getAll().buckets.length).toBe(17);
      expect(start.types.getAll().buckets.some(({ name }) => name === 'foo')).toBe(true);
      expect(start.types.getAll().metrics.length).toBe(25);
      expect(start.types.getAll().metrics.some(({ name }) => name === 'bar')).toBe(true);
    });
  });

  describe('start()', () => {
    test('exposes proper contract', () => {
      const start = service.start(startDeps);
      expect(Object.keys(start).length).toBe(3);
      expect(start).toHaveProperty('calculateAutoTimeExpression');
      expect(start).toHaveProperty('createAggConfigs');
      expect(start).toHaveProperty('types');
    });

    test('types registry returns initialized agg types', () => {
      service.setup(setupDeps);
      const start = service.start(startDeps);

      expect(start.types.get('terms').name).toBe('terms');
    });

    test('registers default agg types', () => {
      service.setup(setupDeps);
      const start = service.start(startDeps);

      const aggTypes = getAggTypes();
      expect(start.types.getAll().buckets.length).toBe(aggTypes.buckets.length);
      expect(start.types.getAll().metrics.length).toBe(aggTypes.metrics.length);
    });

    test('merges default agg types with types registered during setup', () => {
      const setup = service.setup(setupDeps);
      setup.types.registerBucket(
        'foo',
        () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>)
      );
      setup.types.registerMetric(
        'bar',
        () => ({ name: 'bar', type: 'metrics' } as MetricAggType<any>)
      );

      const start = service.start(startDeps);

      const aggTypes = getAggTypes();
      expect(start.types.getAll().buckets.length).toBe(aggTypes.buckets.length + 1);
      expect(start.types.getAll().buckets.some(({ name }) => name === 'foo')).toBe(true);
      expect(start.types.getAll().metrics.length).toBe(aggTypes.metrics.length + 1);
      expect(start.types.getAll().metrics.some(({ name }) => name === 'bar')).toBe(true);
    });
  });

  describe('createGetConfig()', () => {
    let fooSubject$: BehaviorSubject<string>;
    let barSubject$: BehaviorSubject<string>;

    beforeEach(() => {
      jest.clearAllMocks();

      fooSubject$ = new BehaviorSubject('fooVal');
      barSubject$ = new BehaviorSubject('barVal');

      uiSettings.get$.mockImplementation((key: string) => {
        const mockSettings: Record<string, any> = {
          foo: () => fooSubject$,
          bar: () => barSubject$,
        };
        return mockSettings[key] ? mockSettings[key]() : undefined;
      });
    });

    test('returns a function to get the value of the provided setting', () => {
      const requiredSettings = ['foo', 'bar'];
      const subscriptions: Subscription[] = [];
      const getConfig = createGetConfig(uiSettings, requiredSettings, subscriptions);

      expect(getConfig('foo')).toBe('fooVal');
      expect(getConfig('bar')).toBe('barVal');
    });

    test('does not return values for settings that are not explicitly declared', () => {
      const requiredSettings = ['foo', 'bar'];
      const subscriptions: Subscription[] = [];
      const getConfig = createGetConfig(uiSettings, requiredSettings, subscriptions);

      expect(subscriptions.length).toBe(2);
      expect(getConfig('baz')).toBe(undefined);
    });

    test('provides latest value for each setting', () => {
      const requiredSettings = ['foo', 'bar'];
      const subscriptions: Subscription[] = [];
      const getConfig = createGetConfig(uiSettings, requiredSettings, subscriptions);

      expect(getConfig('foo')).toBe('fooVal');
      fooSubject$.next('fooVal2');
      expect(getConfig('foo')).toBe('fooVal2');
      expect(getConfig('foo')).toBe('fooVal2');
      fooSubject$.next('fooVal3');
      expect(getConfig('foo')).toBe('fooVal3');
    });
  });
});
