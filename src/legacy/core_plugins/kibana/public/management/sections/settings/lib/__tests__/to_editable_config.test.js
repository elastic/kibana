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
import { toEditableConfig } from '../to_editable_config';

describe('Settings', function() {
  describe('Advanced', function() {
    describe('toEditableConfig(def, name, value)', function() {
      it('sets name', function() {
        expect(invoke({ name: 'who' }).name).to.equal('who');
      });

      it('sets value', function() {
        expect(invoke({ value: 'what' }).value).to.equal('what');
      });

      it('sets type', function() {
        expect(invoke({ value: 'what' }).type).to.be('string');
        expect(invoke({ value: 0 }).type).to.be('number');
        expect(invoke({ value: [] }).type).to.be('array');
      });

      describe('when given a setting definition object', function() {
        let def;
        beforeEach(function() {
          def = {
            value: 'the original',
            description: 'the one and only',
            options: 'all the options',
          };
        });

        it('is not marked as custom', function() {
          expect(invoke({ def }).isCustom).to.be.false;
        });

        it('sets a default value', function() {
          expect(invoke({ def }).defVal).to.equal(def.value);
        });

        it('sets a description', function() {
          expect(invoke({ def }).description).to.equal(def.description);
        });

        it('sets options', function() {
          expect(invoke({ def }).options).to.equal(def.options);
        });

        describe('that contains a type', function() {
          it('sets that type', function() {
            def.type = 'something';
            expect(invoke({ def }).type).to.equal(def.type);
          });
        });

        describe('that contains a value of type array', function() {
          it('sets type to array', function() {
            def.value = [];
            expect(invoke({ def }).type).to.equal('array');
          });
        });

        describe('that contains a validation object', function() {
          it('constructs a validation regex with message', function() {
            def.validation = {
              regexString: '^foo',
              message: 'must start with "foo"',
            };
            const result = invoke({ def });
            expect(result.validation.regex).to.be.a(RegExp);
            expect(result.validation.message).to.equal('must start with "foo"');
          });
        });
      });

      describe('when not given a setting definition object', function() {
        it('is marked as custom', function() {
          expect(invoke().isCustom).to.be.true;
        });

        it('sets defVal to undefined', function() {
          expect(invoke().defVal).to.be.undefined;
        });

        it('sets description to undefined', function() {
          expect(invoke().description).to.be.undefined;
        });

        it('sets options to undefined', function() {
          expect(invoke().options).to.be.undefined;
        });

        it('sets validation to undefined', function() {
          expect(invoke().validation).to.be.undefined;
        });
      });
    });
  });
});

function invoke({ def = false, name = 'woah', value = 'forreal' } = {}) {
  return toEditableConfig({ def, name, value, isCustom: def === false });
}
