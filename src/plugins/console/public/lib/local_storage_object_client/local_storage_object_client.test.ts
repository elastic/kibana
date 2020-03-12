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
import { LocalObjectStorage } from './local_storage_object_client';
import { StorageMock } from '../../services/storage.mock';

interface FakeLocalObject {
  id: string;
  a: string;
  b: string;
  c: string;
}

describe('LocalObjectStorage', () => {
  let objectStorageClient: LocalObjectStorage<FakeLocalObject>;
  let storageMock: StorageMock;
  beforeEach(() => {
    storageMock = new StorageMock({} as any, 'test');
    objectStorageClient = new LocalObjectStorage<FakeLocalObject>(storageMock, 'test');
  });

  it('gets a subset of keys for a single object', async () => {
    storageMock.get.mockReturnValueOnce({ id: 'test', toBeRemoved: 'bye' });
    const result = await objectStorageClient.get('test', ['id']);

    expect(result).toEqual({ id: 'test' });
  });

  it('gets a subset of keys for a set of objects', async () => {
    storageMock.keys.mockReturnValue(['console_local_test_1', 'console_local_test_2']);
    storageMock.get
      .mockReturnValueOnce({ id: 'test', toBeRemoved: 'bye' })
      .mockReturnValueOnce({ id: 'test', toBeRemoved: 'bye' });
    const result = await objectStorageClient.findAll(['id']);

    expect(result).toEqual([{ id: 'test' }, { id: 'test' }]);
  });
});
