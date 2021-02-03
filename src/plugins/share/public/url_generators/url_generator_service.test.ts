/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UrlGeneratorsService } from './url_generator_service';
import { coreMock } from '../../../../core/public/mocks';

const service = new UrlGeneratorsService();

const setup = service.setup(coreMock.createSetup());
const start = service.start(coreMock.createStart());

test('Asking for a generator that does not exist throws an error', () => {
  expect(() => start.getUrlGenerator('noexist')).toThrowError();
});

test('Registering and retrieving a generator', async () => {
  const generator = setup.registerUrlGenerator({
    id: 'TEST_GENERATOR',
    createUrl: () => Promise.resolve('myurl'),
  });

  expect(generator).toMatchInlineSnapshot(`
    Object {
      "createUrl": [Function],
      "id": "TEST_GENERATOR",
      "isDeprecated": false,
      "migrate": [Function],
    }
  `);
  await expect(generator.migrate({})).rejects.toEqual(
    new Error('You cannot call migrate on a non-deprecated generator.')
  );
  expect(await generator.createUrl({})).toBe('myurl');

  const retrievedGenerator = start.getUrlGenerator('TEST_GENERATOR');
  expect(retrievedGenerator).toMatchInlineSnapshot(`
    Object {
      "createUrl": [Function],
      "id": "TEST_GENERATOR",
      "isDeprecated": false,
      "migrate": [Function],
    }
  `);
  await expect(generator.migrate({})).rejects.toEqual(
    new Error('You cannot call migrate on a non-deprecated generator.')
  );
  expect(await generator.createUrl({})).toBe('myurl');
});

test('Registering a generator with a createUrl function that is deprecated throws an error', () => {
  expect(() =>
    setup.registerUrlGenerator({
      id: 'TEST_GENERATOR',
      migrate: () => Promise.resolve({ id: '', state: {} }),
      createUrl: () => Promise.resolve('myurl'),
      isDeprecated: true,
    })
  ).toThrowError(
    new Error('This generator is marked as deprecated. Do not supply a createUrl fn.')
  );
});

test('Registering a deprecated generator with no migration function throws an error', () => {
  expect(() =>
    setup.registerUrlGenerator({
      id: 'TEST_GENERATOR',
      isDeprecated: true,
    })
  ).toThrowError(
    new Error(
      'If the access link generator is marked as deprecated, you must provide a migration function.'
    )
  );
});

test('Registering a generator with no functions throws an error', () => {
  expect(() =>
    setup.registerUrlGenerator({
      id: 'TEST_GENERATOR',
    })
  ).toThrowError(
    new Error('This generator is not marked as deprecated. Please provide a createUrl fn.')
  );
});

test('Registering a generator with a migrate function that is not deprecated throws an error', () => {
  expect(() =>
    setup.registerUrlGenerator({
      id: 'TEST_GENERATOR',
      migrate: () => Promise.resolve({ id: '', state: {} }),
      isDeprecated: false,
    })
  ).toThrowError(
    new Error('If you provide a migration function, you must mark this generator as deprecated')
  );
});

test('Registering a generator with a migrate function and a createUrl fn throws an error', () => {
  expect(() =>
    setup.registerUrlGenerator({
      id: 'TEST_GENERATOR',
      createUrl: () => Promise.resolve('myurl'),
      migrate: () => Promise.resolve({ id: '', state: {} }),
    })
  ).toThrowError();
});

test('Generator returns migrated url', async () => {
  setup.registerUrlGenerator({
    id: 'v1',
    migrate: (state: { bar: string }) => Promise.resolve({ id: 'v2', state: { foo: state.bar } }),
    isDeprecated: true,
  });
  setup.registerUrlGenerator({
    id: 'v2',
    createUrl: (state: { foo: string }) => Promise.resolve(`www.${state.foo}.com`),
    isDeprecated: false,
  });

  const generator = start.getUrlGenerator('v1');
  expect(generator.isDeprecated).toBe(true);
  expect(await generator.migrate({ bar: 'hi' })).toEqual({ id: 'v2', state: { foo: 'hi' } });
  expect(await generator.createUrl({ bar: 'hi' })).toEqual('www.hi.com');
});
