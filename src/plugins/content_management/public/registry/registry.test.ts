/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentTypeRegistry } from './registry';

let registry: ContentTypeRegistry;

beforeEach(() => {
  registry = new ContentTypeRegistry();
});

test('registering a content type', () => {
  const type = registry.register({
    id: 'test',
    name: 'Test',
    icon: 'test',
    description: 'Test description',
  });

  expect(type.id).toBe('test');
  expect(type.name).toBe('Test');
  expect(type.icon).toBe('test');
  expect(type.description).toBe('Test description');
});

test('registering already registered content type throws', () => {
  registry.register({
    id: 'test',
  });

  expect(() => registry.register({ id: 'test' })).toThrowErrorMatchingInlineSnapshot(
    `"Content type with id \\"test\\" already registered."`
  );
});

test('getting non registered content returns undefined', () => {
  expect(registry.get('test')).toBeUndefined();
});

test('get', () => {
  const type = registry.register({
    id: 'test',
  });

  expect(registry.get('test')).toEqual(type);
});

test('getAll', () => {
  registry.register({
    id: 'test1',
  });
  registry.register({
    id: 'test2',
  });

  expect(registry.getAll()).toHaveLength(2);
});
