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
import { reducer, initialValue } from './text_object';
import { TextObjectWithId } from '../../../common/text_object';

describe('Editor Store', () => {
  const testTextObjects: TextObjectWithId[] = [
    { id: '1', text: 'test1', createdAt: 1, updatedAt: 2, isScratchPad: true },
    { id: '2', text: 'test2', createdAt: 1, updatedAt: 2 },
    { id: '3', text: 'test3', createdAt: 1, updatedAt: 2 },
    { id: '4', text: 'test4', createdAt: 1, updatedAt: 2 },
  ];

  const hashedTestTextObjects = {
    '1': testTextObjects[0],
    '2': testTextObjects[1],
    '3': testTextObjects[2],
    '4': testTextObjects[3],
  };

  describe('Text Objects', () => {
    it('updates many', () => {
      const s1 = reducer(initialValue, {
        type: 'upsertMany',
        payload: testTextObjects,
      });

      expect(s1.textObjects).toEqual(hashedTestTextObjects);
    });

    it('updates one', () => {
      const s1 = reducer(initialValue, {
        type: 'upsertMany',
        payload: testTextObjects,
      });

      const s2 = reducer(s1, {
        type: 'upsert',
        payload: { ...testTextObjects[0], name: 'ok!' },
      });

      expect(s2.textObjects['1'].name).toEqual('ok!');
    });

    it('prevents adding an unknown text object and reports the error', () => {
      const s1 = reducer(initialValue, {
        type: 'upsert',
        payload: { id: '1', who: 'dis' } as any,
      });

      expect(s1.textObjectsSaveError['1']).toContain('Cannot assign');
    });

    it('deletes and defaults back to existing file if current file is deleted', () => {
      const s1 = reducer(initialValue, {
        type: 'upsertMany',
        payload: testTextObjects,
      });

      const s2 = reducer(s1, {
        type: 'setCurrent',
        payload: '3',
      });

      const s3 = reducer(s2, {
        type: 'delete',
        payload: '3',
      });

      expect(s3.textObjects['3']).toBeUndefined();
      expect(s3.currentTextObjectId).toBe('1');
    });
  });
});
