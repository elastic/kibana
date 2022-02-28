/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { regenerateIds } from './regenerate_ids';
import { SavedObject } from '../../types';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('uuidv4 #1')
    .mockReturnValueOnce('uuidv4 #2')
    .mockReturnValueOnce('uuidv4 #3'),
}));

describe('#regenerateIds', () => {
  const objects = [
    { type: 'foo', id: '1' },
    { type: 'bar', id: '2' },
    { type: 'baz', id: '3' },
  ] as SavedObject[];

  test('returns expected values', () => {
    expect(regenerateIds(objects)).toEqual(
      new Map([
        ['foo:1', { destinationId: 'uuidv4 #1', omitOriginId: true }],
        ['bar:2', { destinationId: 'uuidv4 #2', omitOriginId: true }],
        ['baz:3', { destinationId: 'uuidv4 #3', omitOriginId: true }],
      ])
    );
  });
});
