/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findObjectByTitle } from './find_object_by_title';
import { SimpleSavedObject, SavedObjectsClientContract, SavedObject } from '@kbn/core/public';

describe('findObjectByTitle', () => {
  const savedObjectsClient: SavedObjectsClientContract = {} as SavedObjectsClientContract;

  beforeEach(() => {
    savedObjectsClient.find = jest.fn();
  });

  it('returns undefined if title is not provided', async () => {
    const match = await findObjectByTitle(savedObjectsClient, 'index-pattern', '');
    expect(match).toBeUndefined();
  });

  it('matches any case', async () => {
    const indexPattern = new SimpleSavedObject(savedObjectsClient, {
      attributes: { title: 'foo' },
    } as SavedObject);
    savedObjectsClient.find = jest.fn().mockImplementation(() =>
      Promise.resolve({
        savedObjects: [indexPattern],
      })
    );
    const match = await findObjectByTitle(savedObjectsClient, 'index-pattern', 'FOO');
    expect(match).toEqual(indexPattern);
  });
});
