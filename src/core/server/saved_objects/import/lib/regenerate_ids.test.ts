/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockUuidv4 } from './__mocks__';
import type { ObjectKeyProvider } from './get_object_key';
import { regenerateIds } from './regenerate_ids';
import { SavedObject } from '../../types';

describe('#regenerateIds', () => {
  let getObjKey: jest.MockedFunction<ObjectKeyProvider>;

  const mapToObj = <V>(map: Map<string, V>): Record<string, V> => {
    return Object.fromEntries(map.entries());
  };

  const createObj = ({
    id,
    type,
    namespaces,
  }: {
    id: string;
    type: string;
    namespaces?: string[];
  }): SavedObject => ({
    id,
    type,
    namespaces,
    attributes: {},
    references: [],
  });

  beforeEach(() => {
    mockUuidv4.mockReset();

    getObjKey = jest.fn().mockImplementation(({ type, id }) => `${type}:${id}`);
  });

  test('returns expected values', () => {
    mockUuidv4
      .mockReturnValueOnce('uuid1')
      .mockReturnValueOnce('uuid2')
      .mockReturnValueOnce('uuid3');

    const objects = [
      createObj({ type: 'foo', id: '1' }),
      createObj({ type: 'bar', id: '2' }),
      createObj({ type: 'baz', id: '3' }),
    ];

    expect(
      mapToObj(
        regenerateIds({
          objects,
          getObjKey,
        })
      )
    ).toEqual({
      'foo:1': {
        id: 'uuid1',
        omitOriginId: true,
      },
      'bar:2': {
        id: 'uuid2',
        omitOriginId: true,
      },
      'baz:3': {
        id: 'uuid3',
        omitOriginId: true,
      },
    });
  });

  test('call `getObjKey` with each object', () => {
    mockUuidv4
      .mockReturnValueOnce('uuid1')
      .mockReturnValueOnce('uuid2')
      .mockReturnValueOnce('uuid3');

    const objects = [
      createObj({ type: 'foo', id: '1' }),
      createObj({ type: 'shareable', id: '2', namespaces: ['ns1', 'ns2'] }),
      createObj({ type: 'bar', id: '3', namespaces: ['other-ns'] }),
    ];

    regenerateIds({
      objects,
      getObjKey,
    });

    expect(getObjKey).toHaveBeenCalledTimes(3);

    expect(getObjKey).toHaveBeenCalledWith(objects[0]);
    expect(getObjKey).toHaveBeenCalledWith(objects[1]);
    expect(getObjKey).toHaveBeenCalledWith(objects[2]);
  });

  test('generates correct keys for the objects', () => {
    mockUuidv4
      .mockReturnValueOnce('uuid1')
      .mockReturnValueOnce('uuid2')
      .mockReturnValueOnce('uuid3');

    const objects = [
      createObj({ type: 'foo', id: '1' }),
      createObj({ type: 'shareable', id: '2', namespaces: ['ns1', 'ns2'] }),
      createObj({ type: 'bar', id: '3', namespaces: ['other-ns'] }),
    ];

    expect(
      mapToObj(
        regenerateIds({
          objects,
          getObjKey,
        })
      )
    ).toEqual({
      'foo:1': {
        id: 'uuid1',
        omitOriginId: true,
      },
      'shareable:2': {
        id: 'uuid2',
        omitOriginId: true,
      },
      'bar:3': {
        id: 'uuid3',
        omitOriginId: true,
      },
    });
  });
});
