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

import expect from '@kbn/expect';
import { getValType } from './get_val_type';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getValType(def, val)', function () {
      it('should return the explicitly defined type of a setting', function () {
        expect(getValType({ type: 'string' })).to.be('string');
        expect(getValType({ type: 'json' })).to.be('json');
        expect(getValType({ type: 'string', value: 5 })).to.be('string');
      });

      it('should return array if the value is an Array and there is no defined type', function () {
        expect(getValType({ type: 'string' }, [1, 2, 3])).to.be('string');
        expect(getValType({ type: 'json', value: [1, 2, 3] })).to.be('json');

        expect(getValType({ value: 'someString' }, [1, 2, 3])).to.be('array');
        expect(getValType({ value: [1, 2, 3] }, 'someString')).to.be('array');
      });

      it('should return the type of the default value if there is no type and it is not an array', function () {
        expect(getValType({ value: 'someString' })).to.be('string');
        expect(getValType({ value: 'someString' }, 42)).to.be('string');
      });

      it('should return the type of the value if the default value is null', function () {
        expect(getValType({ value: null }, 'someString')).to.be('string');
      });
    });
  });
});
