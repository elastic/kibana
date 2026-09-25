/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeRegistry } from '../type_registry';
import type { ActionTypeModel } from '../types';
import { actionTypeRegistryMock } from '../test_utils/action_type_registry.mock';
import { createCompositeActionTypeRegistry } from './composite_action_type_registry';

describe('createCompositeActionTypeRegistry', () => {
  const overlayModel = actionTypeRegistryMock.createMockActionTypeModel({ id: '.slack2' });
  const baseModel = actionTypeRegistryMock.createMockActionTypeModel({ id: '.email' });

  const createBase = () => {
    const base = new TypeRegistry<ActionTypeModel>();
    base.register(baseModel);
    return base;
  };

  it('prefers overlay models for has and get', () => {
    const overlayOverride = actionTypeRegistryMock.createMockActionTypeModel({ id: '.email' });
    const registry = createCompositeActionTypeRegistry(createBase(), [overlayOverride]);

    expect(registry.has('.email')).toBe(true);
    expect(registry.get('.email')).toBe(overlayOverride);
  });

  it('falls through to the base registry', () => {
    const registry = createCompositeActionTypeRegistry(createBase(), [overlayModel]);

    expect(registry.has('.email')).toBe(true);
    expect(registry.get('.email')).toBe(baseModel);
    expect(registry.has('.slack2')).toBe(true);
    expect(registry.get('.slack2')).toBe(overlayModel);
  });

  it('throws for unknown ids like TypeRegistry', () => {
    const registry = createCompositeActionTypeRegistry(createBase(), [overlayModel]);

    expect(() => registry.get('.missing')).toThrow(/is not registered/);
  });

  it('lists base models then overlay models', () => {
    const registry = createCompositeActionTypeRegistry(createBase(), [overlayModel]);
    expect(registry.list().map((model) => model.id)).toEqual(['.email', '.slack2']);
  });

  it('delegates register to the base registry', () => {
    const base = createBase();
    const registry = createCompositeActionTypeRegistry(base, []);
    const extra = actionTypeRegistryMock.createMockActionTypeModel({ id: '.index' });
    registry.register(extra);
    expect(base.has('.index')).toBe(true);
  });
});
