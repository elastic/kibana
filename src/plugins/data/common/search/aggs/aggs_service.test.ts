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

import { omit } from 'lodash';

import { getAggTypes } from './agg_types';
import {
  AggsService,
  AggsServiceSetupDependencies,
  AggsServiceStartDependencies,
} from './aggs_service';

describe('Aggs service', () => {
  let service: AggsService;
  let setupDeps: AggsServiceSetupDependencies;
  let startDeps: AggsServiceStartDependencies;

  beforeEach(() => {
    service = new AggsService();
    setupDeps = {
      calculateBounds: jest.fn(),
      getConfig: jest.fn(),
      getFieldFormatsStart: jest.fn(),
      isDefaultTimezone: jest.fn(),
      registerFunction: jest.fn(),
    };
    startDeps = {
      getConfig: jest.fn(),
    };
  });

  describe('setup()', () => {
    test('exposes proper contract', () => {
      const setup = service.setup(setupDeps);
      expect(Object.keys(setup).length).toBe(2);
      expect(setup).toHaveProperty('calculateAutoTimeExpression');
      expect(setup).toHaveProperty('types');
    });

    test('registers all agg types', () => {
      service.setup(setupDeps);
      const start = service.start(setupDeps);
      const aggTypes = getAggTypes(omit(setupDeps, 'registerFunction'));
      expect(start.types.getAll().buckets.map((b) => b.name)).toEqual(
        aggTypes.buckets.map((b) => b.name)
      );
      expect(start.types.getAll().metrics.map((m) => m.name)).toEqual(
        aggTypes.metrics.map((m) => m.name)
      );
    });

    test('registers all agg type expression functions', () => {
      service.setup(setupDeps);
      const aggTypes = getAggTypes(omit(setupDeps, 'registerFunction'));
      expect(setupDeps.registerFunction).toHaveBeenCalledTimes(
        aggTypes.buckets.length + aggTypes.metrics.length
      );
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
  });
});
