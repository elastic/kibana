/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createObjectsFilter } from './create_objects_filter';

describe('createObjectsFilter()', () => {
  it('should return false when contains empty parameters', () => {
    const filter = createObjectsFilter([], ({ type, id }) => `${type}:${id}`);
    expect(filter({ type: 'a', id: '1', attributes: {}, references: [] })).toEqual(false);
  });

  it('should return true for objects that are being retried', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
          overwrite: false,
          replaceReferences: [],
        },
      ],
      ({ type, id }) => `${type}:${id}`
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        attributes: {},
        references: [],
      })
    ).toEqual(true);
  });

  it(`should return false for objects that aren't being retried`, () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
          overwrite: false,
          replaceReferences: [],
        },
      ],
      ({ type, id }) => `${type}:${id}`
    );
    expect(
      fn({
        type: 'b',
        id: '1',
        attributes: {},
        references: [],
      })
    ).toEqual(false);
    expect(
      fn({
        type: 'a',
        id: '2',
        attributes: {},
        references: [],
      })
    ).toEqual(false);
  });

  it('should return false for single-namespaced object from another space', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
          namespaces: ['ns-1'],
          overwrite: false,
          replaceReferences: [],
        },
      ],
      ({ type, id, namespaces }) => `${namespaces![0]}:${type}:${id}`
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        namespaces: ['ns-2'],
        attributes: {},
        references: [],
      })
    ).toEqual(false);
  });

  it('should return true for single-namespaced object from the same space', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'a',
          id: '1',
          namespaces: ['ns-1'],
          overwrite: false,
          replaceReferences: [],
        },
      ],
      ({ type, id, namespaces }) => `${namespaces![0]}:${type}:${id}`
    );
    expect(
      fn({
        type: 'a',
        id: '1',
        namespaces: ['ns-1'],
        attributes: {},
        references: [],
      })
    ).toEqual(true);
  });

  it('should return true for matching multi-namespaced object', () => {
    const fn = createObjectsFilter(
      [
        {
          type: 'shareable-type',
          id: '1',
          namespaces: ['ns-1', 'ns-2'],
          overwrite: false,
          replaceReferences: [],
        },
      ],
      ({ type, id }) => `${type}:${id}`
    );
    expect(
      fn({
        type: 'shareable-type',
        id: '1',
        namespaces: ['ns-1', 'ns-2'],
        attributes: {},
        references: [],
      })
    ).toEqual(true);
  });
});
