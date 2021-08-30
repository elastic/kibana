/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ObjectKeyProvider } from './get_object_key';
import type { SavedObject } from '../../types';
import type { SavedObjectsImportRetry } from '../types';
import { splitOverwrites } from './split_overwrites';

describe('splitOverwrites', () => {
  let getObjKey: jest.MockedFunction<ObjectKeyProvider>;

  const createObject = ({ type, id }: { type: string; id: string }): SavedObject => ({
    type,
    id,
    attributes: {},
    references: [],
  });

  const createRetry = ({
    type,
    id,
    overwrite,
  }: {
    type: string;
    id: string;
    overwrite: boolean;
  }): SavedObjectsImportRetry => ({
    type,
    id,
    overwrite,
    replaceReferences: [],
  });

  beforeEach(() => {
    getObjKey = jest.fn().mockImplementation(({ type, id }) => `${type}:${id}`);
  });

  it('should split array accordingly', () => {
    const retries = [
      createRetry({ type: 'a', id: '1', overwrite: true }),
      createRetry({ type: 'b', id: '2', overwrite: false }),
      createRetry({ type: 'c', id: '3', overwrite: true }),
    ];

    const objA = createObject({ id: '1', type: 'a' });
    const objB = createObject({ id: '2', type: 'b' });
    const objC = createObject({ id: '3', type: 'c' });

    const savedObjects = [objA, objB, objC];

    const { objectsToOverwrite, objectsToNotOverwrite } = splitOverwrites({
      savedObjects,
      retries,
      getObjKey,
    });

    expect(objectsToOverwrite.map((obj) => getObjKey(obj))).toEqual([
      getObjKey(objA),
      getObjKey(objC),
    ]);
    expect(objectsToNotOverwrite.map((obj) => getObjKey(obj))).toEqual([getObjKey(objB)]);
  });
});
