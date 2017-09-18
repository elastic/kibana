import expect from 'expect.js';
import { reject } from 'lodash';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { BaseParamTypeProvider } from '../../param_types/base';
import { FieldParamTypeProvider } from '../../param_types/field';

describe('Field', function () {

  let BaseParamType;
  let FieldParamType;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseParamType = Private(BaseParamTypeProvider);
    FieldParamType = Private(FieldParamTypeProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('constructor', function () {
    it('it is an instance of BaseParamType', function () {
      const aggParam = new FieldParamType({
        name: 'field'
      });

      expect(aggParam).to.be.a(BaseParamType);
    });
  });

  describe('getFieldOptions', function () {
    it('should return only aggregatable fields by default', function () {
      const aggParam = new FieldParamType({
        name: 'field'
      });

      const fields = aggParam.getFieldOptions({
        getIndexPattern: () => indexPattern
      });
      expect(fields).to.not.have.length(0);
      for (const field of fields) {
        expect(field.aggregatable).to.be(true);
      }
    });

    it('should return all fields if onlyAggregatable is false', function () {
      const aggParam = new FieldParamType({
        name: 'field'
      });

      aggParam.onlyAggregatable = false;

      const fields = aggParam.getFieldOptions({
        getIndexPattern: () => indexPattern
      });
      const nonAggregatableFields = reject(fields, 'aggregatable');
      expect(nonAggregatableFields).to.not.be.empty();
    });
  });
});
