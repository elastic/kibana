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
import expect from '@kbn/expect';
import { fieldFormats } from 'ui/registry/field_formats';
import { FieldFormat } from '../../../../../../plugins/data/common/field_formats';
import { npStart } from 'ui/new_platform';

const config = npStart.core.uiSettings;

const formatIds = [
  'bytes',
  'date',
  'date_nanos',
  'duration',
  'ip',
  'number',
  'percent',
  'color',
  'string',
  'url',
  '_source',
  'truncate',
  'boolean',
  'relative_date',
  'static_lookup',
];

// eslint-disable-next-line import/no-default-export
export default describe('conformance', function() {
  const getConfig = (...args) => config.get(...args);

  formatIds.forEach(function(id) {
    let instance;
    let Type;

    beforeEach(function() {
      Type = fieldFormats.getType(id);
      instance = fieldFormats.getInstance(id);
    });

    describe(id + ' Type', function() {
      it('has an id', function() {
        expect(Type.id).to.be.a('string');
      });

      it('has a title', function() {
        expect(Type.title).to.be.a('string');
      });

      it('declares compatible field formats as a string or array', function() {
        expect(Type.fieldType).to.be.ok();
        expect(_.isString(Type.fieldType) || Array.isArray(Type.fieldType)).to.be(true);
      });
    });

    describe(id + ' Instance', function() {
      it('extends FieldFormat', function() {
        expect(instance).to.be.a(FieldFormat);
      });
    });
  });

  it('registers all of the fieldFormats', function() {
    expect(_.difference(fieldFormats.raw, formatIds.map(fieldFormats.getType))).to.eql([]);
  });

  describe('Bytes format', basicPatternTests('bytes', require('numeral')));
  describe('Percent Format', basicPatternTests('percent', require('numeral')));
  describe('Date Format', basicPatternTests('date', require('moment')));

  describe('Number Format', function() {
    basicPatternTests('number', require('numeral'))();

    it('tries to parse strings', function() {
      const number = new (fieldFormats.getType('number'))({ pattern: '0.0b' }, getConfig);
      expect(number.convert(123.456)).to.be('123.5B');
      expect(number.convert('123.456')).to.be('123.5B');
    });
  });

  function basicPatternTests(id, lib) {
    const confKey = id === 'date' ? 'dateFormat' : 'format:' + id + ':defaultPattern';

    return function() {
      it('converts using the format:' + id + ':defaultPattern config', function() {
        const inst = fieldFormats.getInstance(id);
        ['0b', '0 b', '0.[000] b', '0.[000]b', '0.[0]b'].forEach(function(pattern) {
          const original = config.get(confKey);
          const num = _.random(-10000, 10000, true);
          config.set(confKey, pattern);
          expect(inst.convert(num)).to.be(lib(num).format(pattern));
          config.set(confKey, original);
        });
      });

      it('uses the pattern param if available', function() {
        const original = config.get(confKey);
        const num = _.random(-10000, 10000, true);
        const defFormat = '0b';
        const customFormat = '0.00000%';

        config.set(confKey, defFormat);
        const defInst = fieldFormats.getInstance(id);

        const Type = fieldFormats.getType(id);
        const customInst = new Type({ pattern: customFormat }, getConfig);

        expect(defInst.convert(num)).to.not.be(customInst.convert(num));
        expect(defInst.convert(num)).to.be(lib(num).format(defFormat));
        expect(customInst.convert(num)).to.be(lib(num).format(customFormat));

        config.set(confKey, original);
      });
    };
  }
});
