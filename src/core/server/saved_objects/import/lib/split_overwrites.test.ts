/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { getObjKey } from '../../service/lib';
import type { SavedObject } from '../../types';
import type { SavedObjectsImportRetry } from '../types';
import { splitOverwrites } from './split_overwrites';

describe('splitOverwrites', () => {
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;
  const namespace = 'foo-ns';

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

  const getKey = (obj: SavedObject, ns = namespace) => getObjKey(obj, typeRegistry, ns);

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
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
      typeRegistry,
      namespace,
    });

    expect(objectsToOverwrite.map((obj) => getKey(obj))).toEqual([getKey(objA), getKey(objC)]);
    expect(objectsToNotOverwrite.map((obj) => getKey(obj))).toEqual([getKey(objB)]);
  });
});
