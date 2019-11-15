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
import { pluginInstance } from 'plugins/kibana/discover/index';
import ngMock from 'ng_mock';
import { fieldCalculator } from '../../components/field_chooser/lib/field_calculator';
import expect from '@kbn/expect';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

// Load the kibana app dependencies.

let indexPattern;

describe('fieldCalculator', function () {
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(ngMock.module('app/discover'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));


  it('should have a _countMissing that counts nulls & undefineds in an array', function () {
    const values = [['foo', 'bar'], 'foo', 'foo', undefined, ['foo', 'bar'], 'bar', 'baz', null, null, null, 'foo', undefined];
    expect(fieldCalculator._countMissing(values)).to.be(5);
  });

  describe('_groupValues', function () {
    let groups;
    let params;
    let values;
    beforeEach(function () {
      values = [['foo', 'bar'], 'foo', 'foo', undefined, ['foo', 'bar'], 'bar', 'baz', null, null, null, 'foo', undefined];
      params = {};
      groups = fieldCalculator._groupValues(values, params);
    });

    it('should have a _groupValues that counts values', function () {
      expect(groups).to.be.an(Object);
    });

    it('should throw an error if any value is a plain object', function () {
      expect(function () { fieldCalculator._groupValues([{}, true, false], params); })
        .to.throwError();
    });

    it('should handle values with dots in them', function () {
      values = ['0', '0.........', '0.......,.....'];
      params = {};
      groups = fieldCalculator._groupValues(values, params);
      expect(groups[values[0]].count).to.be(1);
      expect(groups[values[1]].count).to.be(1);
      expect(groups[values[2]].count).to.be(1);
    });

    it('should have a a key for value in the array when not grouping array terms', function () {
      expect(_.keys(groups).length).to.be(3);
      expect(groups.foo).to.be.a(Object);
      expect(groups.bar).to.be.a(Object);
      expect(groups.baz).to.be.a(Object);
    });

    it('should count array terms independently', function () {
      expect(groups['foo,bar']).to.be(undefined);
      expect(groups.foo.count).to.be(5);
      expect(groups.bar.count).to.be(3);
      expect(groups.baz.count).to.be(1);
    });

    describe('grouped array terms', function () {
      beforeEach(function () {
        params.grouped = true;
        groups = fieldCalculator._groupValues(values, params);
      });

      it('should group array terms when passed params.grouped', function () {
        expect(_.keys(groups).length).to.be(4);
        expect(groups['foo,bar']).to.be.a(Object);
      });

      it('should contain the original array as the value', function () {
        expect(groups['foo,bar'].value).to.eql(['foo', 'bar']);
      });

      it('should count the pairs separately from the values they contain', function () {
        expect(groups['foo,bar'].count).to.be(2);
        expect(groups.foo.count).to.be(3);
        expect(groups.bar.count).to.be(1);
      });
    });
  });

  describe('getFieldValues', function () {
    let hits;

    beforeEach(function () {
      hits = _.each(require('fixtures/real_hits.js'), indexPattern.flattenHit);
    });

    it('Should return an array of values for _source fields', function () {
      const extensions = fieldCalculator.getFieldValues(hits, indexPattern.fields.getByName('extension'));
      expect(extensions).to.be.an(Array);
      expect(_.filter(extensions, function (v) { return v === 'html'; }).length).to.be(8);
      expect(_.uniq(_.clone(extensions)).sort()).to.eql(['gif', 'html', 'php', 'png']);
    });

    it('Should return an array of values for core meta fields', function () {
      const types = fieldCalculator.getFieldValues(hits, indexPattern.fields.getByName('_type'));
      expect(types).to.be.an(Array);
      expect(_.filter(types, function (v) { return v === 'apache'; }).length).to.be(18);
      expect(_.uniq(_.clone(types)).sort()).to.eql(['apache', 'nginx']);
    });
  });


  describe('getFieldValueCounts', function () {
    let params;
    beforeEach(function () {
      params = {
        hits: require('fixtures/real_hits.js'),
        field: indexPattern.fields.getByName('extension'),
        count: 3
      };
    });

    it('counts the top 3 values', function () {
      const extensions = fieldCalculator.getFieldValueCounts(params);
      expect(extensions).to.be.an(Object);
      expect(extensions.buckets).to.be.an(Array);
      expect(extensions.buckets.length).to.be(3);
      expect(_.pluck(extensions.buckets, 'value')).to.eql(['html', 'php', 'gif']);
      expect(extensions.error).to.be(undefined);
    });

    it('fails to analyze geo and attachment types', function () {
      params.field = indexPattern.fields.getByName('point');
      expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);

      params.field = indexPattern.fields.getByName('area');
      expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);

      params.field = indexPattern.fields.getByName('request_body');
      expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);
    });

    it('fails to analyze fields that are in the mapping, but not the hits', function () {
      params.field = indexPattern.fields.getByName('ip');
      expect(fieldCalculator.getFieldValueCounts(params).error).to.not.be(undefined);
    });

    it('counts the total hits', function () {
      expect(fieldCalculator.getFieldValueCounts(params).total).to.be(params.hits.length);
    });

    it('counts the hits the field exists in', function () {
      params.field = indexPattern.fields.getByName('phpmemory');
      expect(fieldCalculator.getFieldValueCounts(params).exists).to.be(5);
    });
  });
});
