/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
});
