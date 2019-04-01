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
import Chance from 'chance';

const chance = new Chance();
import {
  KbnFieldType,
  getKbnFieldType,
  castEsToKbnFieldTypeName,
  getKbnTypeNames
} from '../kbn_field_types';

describe('utils/kbn_field_types', () => {
  describe('KbnFieldType', () => {
    it('defaults', () => {
      expect(new KbnFieldType())
        .to.have.property('name', undefined)
        .and.have.property('sortable', false)
        .and.have.property('filterable', false)
        .and.have.property('esTypes').eql([]);
    });

    it('assigns name, sortable, filterable, and esTypes options to itself', () => {
      const name = chance.word();
      const sortable = chance.bool();
      const filterable = chance.bool();
      const esTypes = chance.n(chance.word, 3);

      expect(new KbnFieldType({ name, sortable, filterable, esTypes }))
        .to.have.property('name', name)
        .and.have.property('sortable', sortable)
        .and.have.property('filterable', filterable)
        .and.have.property('esTypes').eql(esTypes);
    });

    it('prevents modification', () => {
      const type = new KbnFieldType();
      expect(() => type.name = null).to.throwError();
      expect(() => type.sortable = null).to.throwError();
      expect(() => type.filterable = null).to.throwError();
      expect(() => type.esTypes = null).to.throwError();
      expect(() => type.esTypes.push(null)).to.throwError();
    });

    it('allows extension', () => {
      const type = new KbnFieldType();
      type.$hashKey = '123';
      expect(type).to.have.property('$hashKey', '123');
    });
  });

  describe('getKbnFieldType()', () => {
    it('returns a KbnFieldType instance by name', () => {
      expect(getKbnFieldType('string')).to.be.a(KbnFieldType);
    });

    it('returns undefined for invalid name', () => {
      expect(getKbnFieldType(chance.sentence())).to.be(undefined);
    });
  });

  describe('castEsToKbnFieldTypeName()', () => {
    it('returns the kbnFieldType name that matches the esType', () => {
      expect(castEsToKbnFieldTypeName('keyword')).to.be('string');
      expect(castEsToKbnFieldTypeName('float')).to.be('number');
    });

    it('returns unknown for unknown es types', () => {
      expect(castEsToKbnFieldTypeName(chance.sentence())).to.be('unknown');
    });
  });

  describe('getKbnTypeNames()', () => {
    it('returns a list of all kbnFieldType names', () => {
      expect(getKbnTypeNames().sort()).to.eql([
        '_source',
        'attachment',
        'boolean',
        'conflict',
        'date',
        'geo_point',
        'geo_shape',
        'ip',
        'murmur3',
        'nested',
        'number',
        'object',
        'string',
        'unknown',
      ]);
    });
  });
});
