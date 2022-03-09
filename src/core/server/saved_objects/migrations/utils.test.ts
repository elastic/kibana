/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectMigrationContext, SavedObjectMigrationMap } from '.';
import { mergeSavedObjectMigrationMaps } from './utils';
import { SavedObjectUnsanitizedDoc } from '..';

describe('mergeSavedObjectMigrationMaps', () => {
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

  test('correctly merges two saved object migration maps', () => {
    const context = { log: { info: jest.fn() } } as unknown as SavedObjectMigrationContext;

    const result = mergeSavedObjectMigrationMaps(obj1, obj2);
    expect(
      result['7.12.0']({ attributes: { counter: 5 } } as SavedObjectUnsanitizedDoc, context)
        .attributes.counter
    ).toEqual(3);
    expect(context.log.info).toHaveBeenCalledTimes(1);

    expect(
      result['7.12.1']({ attributes: { counter: 5 } } as SavedObjectUnsanitizedDoc, context)
        .attributes.counter
    ).toEqual(6);
    expect(context.log.info).toHaveBeenCalledTimes(2);

    expect(
      result['7.12.2']({ attributes: { counter: 5 } } as SavedObjectUnsanitizedDoc, context)
        .attributes.counter
    ).toEqual(9);
    expect(context.log.info).toHaveBeenCalledTimes(4);
  });
});
