/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObject } from '../../types/saved_objects';
import type { SavedObjectsClientContract } from './saved_objects_client';
import { SimpleSavedObject } from './simple_saved_object';

describe('SimpleSavedObject', () => {
  let client: SavedObjectsClientContract;

  beforeEach(() => {
    client = {
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;
  });

  it('persists type and id', () => {
    const id = 'logstash-*';
    const type = 'index-pattern';

    const savedObject = new SimpleSavedObject(client, { id, type } as SavedObject);

    expect(savedObject.id).toEqual(id);
    expect(savedObject.type).toEqual(type);
  });

  it('persists attributes', () => {
    const attributes = { title: 'My title' };

    const savedObject = new SimpleSavedObject(client, { attributes } as SavedObject);

    expect(savedObject.attributes).toEqual(attributes);
  });

  it('persists version', () => {
    const version = '2';

    const savedObject = new SimpleSavedObject(client, { version } as SavedObject);
    expect(savedObject._version).toEqual(version);
  });
});
