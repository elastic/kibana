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
import { ObjDefine } from './obj_define';

describe('ObjDefine Utility', function() {
  function flatten(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  describe('#writ', function() {
    it('creates writeable properties', function() {
      const def = new ObjDefine();
      def.writ('name', 'foo');

      const obj = def.create();
      expect(obj).to.have.property('name', 'foo');

      obj.name = 'bar';
      expect(obj).to.have.property('name', 'bar');
    });

    it('exports the property to JSON', function() {
      const def = new ObjDefine();
      def.writ('name', 'foo');
      expect(flatten(def.create())).to.have.property('name', 'foo');
    });

    it("does not export property to JSON it it's undefined or null", function() {
      const def = new ObjDefine();
      def.writ('name');
      expect(flatten(def.create())).to.not.have.property('name');

      def.writ('name', null);
      expect(flatten(def.create())).to.not.have.property('name');
    });

    it('switched to exporting if a value is written', function() {
      const def = new ObjDefine();
      def.writ('name');

      const obj = def.create();
      expect(flatten(obj)).to.not.have.property('name');

      obj.name = null;
      expect(flatten(obj)).to.not.have.property('name');

      obj.name = 'foo';
      expect(flatten(obj)).to.have.property('name', 'foo');
    });

    it('setting a writ value to null prevents it from exporting', function() {
      const def = new ObjDefine();
      def.writ('name', 'foo');

      const obj = def.create();
      expect(flatten(obj)).to.have.property('name', 'foo');

      obj.name = null;
      expect(flatten(obj)).to.not.have.property('name');
    });
  });

  describe('#fact', function() {
    it('creates an immutable field', function() {
      const def = new ObjDefine();
      const val = 'foo';
      const notval = 'bar';
      def.fact('name', val);
      const obj = def.create();

      obj.name = notval; // UPDATE SHOULD BE IGNORED
      expect(obj).to.have.property('name', val);
    });

    it('exports the fact to JSON', function() {
      const def = new ObjDefine();
      def.fact('name', 'foo');
      expect(flatten(def.create())).to.have.property('name', 'foo');
    });
  });

  describe('#comp', function() {
    it('creates an immutable field', function() {
      const def = new ObjDefine();
      const val = 'foo';
      const notval = 'bar';
      def.comp('name', val);
      const obj = def.create();

      expect(function() {
        'use strict'; // eslint-disable-line strict

        obj.name = notval;
      }).to.throwException();
    });

    it('does not export the computed value to JSON', function() {
      const def = new ObjDefine();
      def.comp('name', 'foo');
      expect(flatten(def.create())).to.not.have.property('name');
    });
  });

  describe('#create', function() {
    it('creates object that inherits from the prototype', function() {
      function SomeClass() {}

      const def = new ObjDefine(null, SomeClass.prototype);
      const obj = def.create();

      expect(obj).to.be.a(SomeClass);
    });

    it('uses the defaults for property values', function() {
      const def = new ObjDefine({ name: 'bar' });
      def.fact('name');

      const obj = def.create();

      expect(obj).to.have.property('name', 'bar');
    });

    it('ignores default values that are not defined properties', function() {
      const def = new ObjDefine({ name: 'foo', name2: 'bar' });
      const obj = def.create();

      expect(obj).to.not.have.property('name');
      expect(obj).to.not.have.property('name2');
    });
  });
});
