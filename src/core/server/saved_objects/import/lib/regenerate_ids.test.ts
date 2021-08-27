/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockUuidv4 } from './__mocks__';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { regenerateIds } from './regenerate_ids';
import { SavedObject } from '../../types';

describe('#regenerateIds', () => {
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;
  const namespace = 'foo-ns';

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

    typeRegistry = typeRegistryMock.create();
    typeRegistry.isSingleNamespace.mockImplementation((type) => {
      return type !== 'shareable';
    });
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
          typeRegistry,
          namespace,
        })
      )
    ).toEqual({
      'foo-ns:foo:1': {
        id: 'uuid1',
        omitOriginId: true,
      },
      'foo-ns:bar:2': {
        id: 'uuid2',
        omitOriginId: true,
      },
      'foo-ns:baz:3': {
        id: 'uuid3',
        omitOriginId: true,
      },
    });
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
          typeRegistry,
          namespace,
        })
      )
    ).toEqual({
      'foo-ns:foo:1': {
        id: 'uuid1',
        omitOriginId: true,
      },
      'shareable:2': {
        id: 'uuid2',
        omitOriginId: true,
      },
      'other-ns:bar:3': {
        id: 'uuid3',
        omitOriginId: true,
      },
    });
  });
});
