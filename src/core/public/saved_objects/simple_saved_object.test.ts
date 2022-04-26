/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../server';
import { SimpleSavedObject } from './simple_saved_object';
import { SavedObjectsClientContract } from './saved_objects_client';

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

  it('save() changes updatedAt field on existing SimpleSavedObject with an id', async function () {
    const date = new Date();
    const initialDate = date.toISOString();
    date.setDate(date.getDate() + 1);
    const secondDate = date.toISOString();

    const config = {
      attributes: {},
      id: 'id',
      type: 'type',
    };

    const initialSavedObject = new SimpleSavedObject(client, {
      ...config,
      updated_at: initialDate,
    } as SavedObject);

    const updatedSavedObject = new SimpleSavedObject(client, {
      ...config,
      updated_at: secondDate,
    } as SavedObject);

    (client.update as jest.Mock).mockReturnValue(Promise.resolve(updatedSavedObject));

    const initialValue = initialSavedObject.updatedAt;
    await initialSavedObject.save();
    const updatedValue = updatedSavedObject.updatedAt;

    expect(initialValue).not.toEqual(updatedValue);
    expect(initialSavedObject.updatedAt).toEqual(updatedValue);
  });

  it('save() changes updatedAt field on existing SimpleSavedObject without an id', async () => {
    const date = new Date();
    const initialDate = date.toISOString();
    date.setDate(date.getDate() + 1);
    const secondDate = date.toISOString();

    const config = {
      attributes: {},
      type: 'type',
    };

    const initialSavedObject = new SimpleSavedObject(client, {
      ...config,
      updated_at: initialDate,
    } as SavedObject);

    const updatedSavedObject = new SimpleSavedObject(client, {
      ...config,
      updated_at: secondDate,
    } as SavedObject);

    (client.create as jest.Mock).mockReturnValue(Promise.resolve(updatedSavedObject));

    const initialValue = initialSavedObject.updatedAt;
    await initialSavedObject.save();
    const updatedValue = updatedSavedObject.updatedAt;

    expect(initialValue).not.toEqual(updatedValue);
    expect(initialSavedObject.updatedAt).toEqual(updatedValue);
  });
});
