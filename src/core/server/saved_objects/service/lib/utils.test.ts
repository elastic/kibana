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

import { SavedObjectsUtils } from './utils';

describe('SavedObjectsUtils', () => {
  const { namespaceIdToString, namespaceStringToId } = SavedObjectsUtils;

  describe('#namespaceIdToString', () => {
    it('converts `undefined` to default namespace string', () => {
      expect(namespaceIdToString(undefined)).toEqual('default');
    });

    it('leaves other namespace IDs as-is', () => {
      expect(namespaceIdToString('foo')).toEqual('foo');
    });

    it('throws an error when a namespace ID is an empty string', () => {
      expect(() => namespaceIdToString('')).toThrowError('namespace cannot be an empty string');
    });
  });

  describe('#namespaceStringToId', () => {
    it('converts default namespace string to `undefined`', () => {
      expect(namespaceStringToId('default')).toBeUndefined();
    });

    it('leaves other namespace strings as-is', () => {
      expect(namespaceStringToId('foo')).toEqual('foo');
    });

    it('throws an error when a namespace string is falsy', () => {
      const test = (arg: any) =>
        expect(() => namespaceStringToId(arg)).toThrowError('namespace must be a non-empty string');

      test(undefined);
      test(null);
      test('');
    });
  });
});
