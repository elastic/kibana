/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HousekeepingRegistry } from './registry';
import { indicesProvider, pipelinesProvider } from './test_helpers';

describe('HousekeepingRegistry', () => {
  it('collects providers and their resource types', () => {
    const registry = new HousekeepingRegistry();
    registry.registerResourceProvider(indicesProvider());
    registry.registerResourceProvider(pipelinesProvider());

    expect(registry.getProviders().map(({ id }) => id)).toEqual(['indices', 'pipelines']);
    expect(registry.getResourceTypes().map(({ id }) => id)).toEqual(['index', 'pipeline']);
  });

  it('rejects a resource type that another provider already owns', () => {
    const registry = new HousekeepingRegistry();
    registry.registerResourceProvider(indicesProvider());

    expect(() => registry.registerResourceProvider(indicesProvider({ id: 'other' }))).toThrow(
      'Housekeeping resource type [index] is already registered'
    );
  });

  it('rejects duplicated provider and check ids', () => {
    const registry = new HousekeepingRegistry();
    registry.registerResourceProvider(indicesProvider());
    const check = {
      id: 'check',
      title: 'Check',
      description: 'Check',
      resourceTypes: ['index'],
      run: async () => [],
    };
    registry.registerCheck(check);

    expect(() => registry.registerResourceProvider(indicesProvider())).toThrow(
      'Housekeeping provider or check [indices] is already registered'
    );
    expect(() => registry.registerCheck(check)).toThrow(
      'Housekeeping provider or check [check] is already registered'
    );
    // A check can't take the id of a provider, since both name the checks that could not run.
    expect(() => registry.registerCheck({ ...check, id: 'indices' })).toThrow(
      'Housekeeping provider or check [indices] is already registered'
    );
  });
});
