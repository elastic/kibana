/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectMigrationContext,
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { mergeSavedObjectMigrations, mergeSavedObjectMigrationMaps } from './merge_migrations';

describe('mergeSavedObjectMigrations', () => {
  test('merges migration parameters with a migration function', () => {
    // @ts-expect-error
    expect(mergeSavedObjectMigrations({ deferred: true, transform: jest.fn() }, jest.fn())).toEqual(
      {
        deferred: false,
        transform: expect.any(Function),
      }
    );
  });

  test('returns a function on merging two functions', () => {
    expect(mergeSavedObjectMigrations(jest.fn(), jest.fn())).toBeInstanceOf(Function);
  });

  test('merges two deferred migrations', () => {
    expect(
      mergeSavedObjectMigrations(
        // @ts-expect-error
        { deferred: true, transform: jest.fn() },
        { deferred: true, transform: jest.fn() }
      )
    ).toEqual({
      deferred: true,
      transform: expect.any(Function),
    });
  });

  test('merges two non-deferred migrations', () => {
    expect(
      mergeSavedObjectMigrations(
        { deferred: false, transform: jest.fn() },
        { deferred: false, transform: jest.fn() }
      )
    ).toEqual({
      deferred: false,
      transform: expect.any(Function),
    });
  });

  test('merges deferred and non-deferred migrations', () => {
    expect(
      mergeSavedObjectMigrations(
        // @ts-expect-error
        { deferred: true, transform: jest.fn() },
        { deferred: false, transform: jest.fn() }
      )
    ).toEqual({
      deferred: false,
      transform: expect.any(Function),
    });
  });
});

describe('mergeSavedObjectMigrationMaps', () => {
  test('correctly merges two saved object migration maps', () => {
    const obj1: SavedObjectMigrationMap = {
      '7.12.1': (doc, context) => {
        context.log.info('');
        return {
          ...doc,
          attributes: { ...doc.attributes, counter: doc.attributes.counter + 1 },
        };
      },
      '7.12.2': (doc, context) => {
        context.log.info('');
        return {
          ...doc,
          attributes: { ...doc.attributes, counter: doc.attributes.counter + 2 },
        };
      },
    };

    const obj2: SavedObjectMigrationMap = {
      '7.12.0': (doc, context) => {
        context.log.info('');
        return {
          ...doc,
          attributes: { ...doc.attributes, counter: doc.attributes.counter - 2 },
        };
      },
      '7.12.2': (doc, context) => {
        context.log.info('');
        return {
          ...doc,
          attributes: { ...doc.attributes, counter: doc.attributes.counter + 2 },
        };
      },
    };
    const context = { log: { info: jest.fn() } } as unknown as SavedObjectMigrationContext;

    const result = mergeSavedObjectMigrationMaps(obj1, obj2);
    expect(
      (result['7.12.0'] as SavedObjectMigrationFn)(
        { attributes: { counter: 5 } } as SavedObjectUnsanitizedDoc,
        context
      )
    ).toHaveProperty('attributes.counter', 3);
    expect(context.log.info).toHaveBeenCalledTimes(1);

    expect(
      (result['7.12.1'] as SavedObjectMigrationFn)(
        { attributes: { counter: 5 } } as SavedObjectUnsanitizedDoc,
        context
      )
    ).toHaveProperty('attributes.counter', 6);
    expect(context.log.info).toHaveBeenCalledTimes(2);

    expect(
      (result['7.12.2'] as SavedObjectMigrationFn)(
        { attributes: { counter: 5 } } as SavedObjectUnsanitizedDoc,
        context
      )
    ).toHaveProperty('attributes.counter', 9);
    expect(context.log.info).toHaveBeenCalledTimes(4);
  });
});
