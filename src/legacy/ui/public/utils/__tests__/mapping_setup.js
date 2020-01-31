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

import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import { expandShorthand } from '../mapping_setup';

describe('ui/utils/mapping_setup', function() {
  beforeEach(ngMock.module('kibana'));

  describe('#expandShorthand()', function() {
    it('allows shortcuts for field types by just setting the value to the type name', function() {
      const mapping = expandShorthand({ foo: 'boolean' });
      expect(mapping.foo.type).to.be('boolean');
    });

    it('can set type as an option', function() {
      const mapping = expandShorthand({ foo: { type: 'integer' } });
      expect(mapping.foo.type).to.be('integer');
    });

    describe('when type is json', function() {
      it('returned object is type text', function() {
        const mapping = expandShorthand({ foo: 'json' });
        expect(mapping.foo.type).to.be('text');
      });

      it('returned object has _serialize function', function() {
        const mapping = expandShorthand({ foo: 'json' });
        expect(_.isFunction(mapping.foo._serialize)).to.be(true);
      });

      it('returned object has _deserialize function', function() {
        const mapping = expandShorthand({ foo: 'json' });
        expect(_.isFunction(mapping.foo._serialize)).to.be(true);
      });
    });
  });
});
