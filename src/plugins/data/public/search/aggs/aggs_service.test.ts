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

import { BehaviorSubject, Subscription } from 'rxjs';

import { coreMock } from '../../../../../core/public/mocks';
import { expressionsPluginMock } from '../../../../../plugins/expressions/public/mocks';
import { BucketAggType, getAggTypes, MetricAggType } from '../../../common';
import { fieldFormatsServiceMock } from '../../field_formats/mocks';
import { dataPluginMock } from '../../mocks';

import {
  AggsService,
  AggsSetupDependencies,
  AggsStartDependencies,
  createGetConfig,
} from './aggs_service';

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
      expect(start.types.getAll().buckets.length).toBe(11);
      expect(start.types.getAll().metrics.length).toBe(21);
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
      expect(start.types.getAll().buckets.length).toBe(12);
      expect(start.types.getAll().buckets.some(({ name }) => name === 'foo')).toBe(true);
      expect(start.types.getAll().metrics.length).toBe(22);
      expect(start.types.getAll().metrics.some(({ name }) => name === 'bar')).toBe(true);
    });
  });

  describe('start()', () => {
    test('exposes proper contract', () => {
      const start = service.start(startDeps);
      expect(Object.keys(start).length).toBe(4);
      expect(start).toHaveProperty('calculateAutoTimeExpression');
      expect(start).toHaveProperty('getDateMetaByDatatableColumn');
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
