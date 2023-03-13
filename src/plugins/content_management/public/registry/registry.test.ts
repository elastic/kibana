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

const versionInfo = {
  latest: 'v2',
} as const;

test('registering a content type', () => {
  const type = registry.register({
    id: 'test',
    name: 'Test',
    icon: 'test',
    description: 'Test description',
    version: versionInfo,
  });

  expect(type.id).toBe('test');
  expect(type.name).toBe('Test');
  expect(type.icon).toBe('test');
  expect(type.description).toBe('Test description');
  expect(type.version).toEqual(versionInfo);
});

test('registering already registered content type throws', () => {
  registry.register({
    id: 'test',
    version: versionInfo,
  });

  expect(() =>
    registry.register({ id: 'test', version: versionInfo })
  ).toThrowErrorMatchingInlineSnapshot(`"Content type with id \\"test\\" already registered."`);
});

test('registering without version throws', () => {
  expect(() => {
    registry.register({
      id: 'test',
    } as any);
  }).toThrowError('Invalid version [undefined]. Must follow the pattern [v${number}]');
});

test('registering invalid version throws', () => {
  expect(() => {
    registry.register({
      id: 'test',
      version: {
        latest: 'bad',
      },
    } as any);
  }).toThrowError('Invalid version [bad]. Must follow the pattern [v${number}]');

  expect(() => {
    registry.register({
      id: 'test',
      version: {
        latest: 'v0',
      },
    });
  }).toThrowError('Version must be >= 1');
});

test('getting non registered content returns undefined', () => {
  expect(registry.get('test')).toBeUndefined();
});

test('get', () => {
  const type = registry.register({
    id: 'test',
    version: versionInfo,
  });

  expect(registry.get('test')).toEqual(type);
});

test('getAll', () => {
  registry.register({
    id: 'test1',
    version: versionInfo,
  });
  registry.register({
    id: 'test2',
    version: versionInfo,
  });

  expect(registry.getAll()).toHaveLength(2);
});
