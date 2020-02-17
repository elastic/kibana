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
import { reducer, initialValue } from './editor';
import { TextObject } from '../../../common/text_object/text_object';

describe('Editor Store', () => {
  const testTextObjects: TextObject[] = [
    { id: '1', text: 'test1', createdAt: 1, updatedAt: 2 },
    { id: '2', text: 'test2', createdAt: 1, updatedAt: 2 },
    { id: '3', text: 'test3', createdAt: 1, updatedAt: 2 },
    { id: '4', text: 'test4', createdAt: 1, updatedAt: 2 },
  ];

  const hashedTestTextObjects = {
    '1': { id: '1', text: 'test1', createdAt: 1, updatedAt: 2 },
    '2': { id: '2', text: 'test2', createdAt: 1, updatedAt: 2 },
    '3': { id: '3', text: 'test3', createdAt: 1, updatedAt: 2 },
    '4': { id: '4', text: 'test4', createdAt: 1, updatedAt: 2 },
  };

  describe('Text Objects', () => {
    it('updates many', () => {
      const s1 = reducer(initialValue, {
        type: 'textObject.upsertMany',
        payload: testTextObjects,
      });

      expect(s1.textObjects).toEqual(hashedTestTextObjects);
    });

    it('updates one', () => {
      const s1 = reducer(initialValue, {
        type: 'textObject.upsertMany',
        payload: testTextObjects,
      });

      const s2 = reducer(s1, {
        type: 'textObject.upsert',
        payload: { ...testTextObjects[0], text: 'ok!' },
      });

      expect(s2.textObjects['1'].text).toEqual('ok!');
    });

    it('prevents adding an unknown text object', () => {
      expect(() =>
        reducer(initialValue, {
          type: 'textObject.upsert',
          payload: { id: '1', whoIs: 'this' } as any,
        })
      ).toThrow('Cannot assign');
    });
  });
});
