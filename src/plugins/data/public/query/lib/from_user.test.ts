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

import { fromUser } from '../';

describe('user input helpers', function() {
  describe('user input parser', function() {
    it('should return the input if passed an object', function() {
      expect(fromUser({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });

    it('unless the object is empty, then convert it to an empty string', function() {
      expect(fromUser({})).toEqual('');
    });

    it('should pass through input strings that not start with {', function() {
      expect(fromUser('foo')).toEqual('foo');
      expect(fromUser('400')).toEqual('400');
      expect(fromUser('true')).toEqual('true');
    });

    it('should parse valid JSON and return the object instead of a string', function() {
      expect(fromUser('{}')).toEqual({});

      // invalid json remains a string
      expect(fromUser('{a:b}')).toEqual('{a:b}');
    });
  });
});
