/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentTypeRegistry } from './registry';

let registry: ContentTypeRegistry;

beforeEach(() => {
  registry = new ContentTypeRegistry();
});

const versionInfo = {
  latest: 2,
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

test('registering string number version converts it to number', () => {
  registry.register({
    id: 'test',
    version: { latest: '123' },
  } as any);

  expect(registry.get('test')?.version).toEqual({ latest: 123 });
});

test('registering without version throws', () => {
  expect(() => {
    registry.register({
      id: 'test',
    } as any);
  }).toThrowError('Invalid version [undefined]. Must be an integer.');
});

test('registering invalid version throws', () => {
  expect(() => {
    registry.register({
      id: 'test',
      version: {
        latest: 'bad',
      },
    } as any);
  }).toThrowError('Invalid version [bad]. Must be an integer.');

  expect(() => {
    registry.register({
      id: 'test',
      version: {
        latest: 0,
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
