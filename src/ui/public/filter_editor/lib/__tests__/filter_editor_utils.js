import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import Promise from 'bluebird';
import {
  phraseFilter,
  scriptedPhraseFilter,
  phrasesFilter,
  rangeFilter,
  existsFilter
} from 'fixtures/filters';
import stubbedLogstashIndexPattern from 'fixtures/stubbed_logstash_index_pattern';
import stubbedLogstashFields from 'fixtures/logstash_fields';
import { FILTER_OPERATORS } from '../filter_operators';
import {
  getQueryDslFromFilter,
  getFieldFromFilter,
  getOperatorFromFilter,
  getParamsFromFilter,
  getFieldOptions,
  getOperatorOptions,
  isFilterValid,
  buildFilter
} from '../filter_editor_utils';

describe('FilterEditorUtils', function () {
  beforeEach(ngMock.module('kibana'));

  let indexPattern;
  let fields;
  beforeEach(function () {
    ngMock.inject(function (Private) {
      indexPattern = Private(stubbedLogstashIndexPattern);
      fields = stubbedLogstashFields();
    });
  });

  describe('getQueryDslFromFilter', function () {
    it('should return query DSL without meta and $state', function () {
      const queryDsl = getQueryDslFromFilter(phraseFilter);
      expect(queryDsl).to.not.have.key('meta');
      expect(queryDsl).to.not.have.key('$state');
      expect(queryDsl).to.have.key('query');
    });
  });

  describe('getFieldFromFilter', function () {
    let indexPatterns;
    beforeEach(function () {
      indexPatterns = {
        get: sinon.stub().returns(Promise.resolve(indexPattern))
      };
    });

    it('should return the field from the filter', function (done) {
      getFieldFromFilter(phraseFilter, indexPatterns)
        .then((field) => {
          expect(field).to.be.ok();
          done();
        });
    });
  });

  describe('getOperatorFromFilter', function () {
    it('should return "is" for phrase filter', function () {
      const operator = getOperatorFromFilter(phraseFilter);
      expect(operator.name).to.be('is');
      expect(operator.negate).to.be(false);
    });

    it('should return "is not" for negated phrase filter', function () {
      const negate = phraseFilter.meta.negate;
      phraseFilter.meta.negate = true;
      const operator = getOperatorFromFilter(phraseFilter);
      expect(operator.name).to.be('is not');
      expect(operator.negate).to.be(true);
      phraseFilter.meta.negate = negate;
    });

    it('should return "is one of" for phrases filter', function () {
      const operator = getOperatorFromFilter(phrasesFilter);
      expect(operator.name).to.be('is one of');
      expect(operator.negate).to.be(false);
    });

    it('should return "is not one of" for negated phrases filter', function () {
      const negate = phrasesFilter.meta.negate;
      phrasesFilter.meta.negate = true;
      const operator = getOperatorFromFilter(phrasesFilter);
      expect(operator.name).to.be('is not one of');
      expect(operator.negate).to.be(true);
      phrasesFilter.meta.negate = negate;
    });

    it('should return "is between" for range filter', function () {
      const operator = getOperatorFromFilter(rangeFilter);
      expect(operator.name).to.be('is between');
      expect(operator.negate).to.be(false);
    });

    it('should return "is not between" for negated range filter', function () {
      const negate = rangeFilter.meta.negate;
      rangeFilter.meta.negate = true;
      const operator = getOperatorFromFilter(rangeFilter);
      expect(operator.name).to.be('is not between');
      expect(operator.negate).to.be(true);
      rangeFilter.meta.negate = negate;
    });

    it('should return "exists" for exists filter', function () {
      const operator = getOperatorFromFilter(existsFilter);
      expect(operator.name).to.be('exists');
      expect(operator.negate).to.be(false);
    });

    it('should return "does not exists" for negated exists filter', function () {
      const negate = existsFilter.meta.negate;
      existsFilter.meta.negate = true;
      const operator = getOperatorFromFilter(existsFilter);
      expect(operator.name).to.be('does not exist');
      expect(operator.negate).to.be(true);
      existsFilter.meta.negate = negate;
    });
  });

  describe('getParamsFromFilter', function () {
    it('should retrieve params from phrase filter', function () {
      const params = getParamsFromFilter(phraseFilter);
      expect(params.phrase).to.be('ios');
    });

    it('should retrieve params from scripted phrase filter', function () {
      const params = getParamsFromFilter(scriptedPhraseFilter);
      expect(params.phrase).to.be('i am a string');
    });

    it('should retrieve params from phrases filter', function () {
      const params = getParamsFromFilter(phrasesFilter);
      expect(params.phrases).to.eql(['win xp', 'osx']);
    });

    it('should retrieve params from range filter', function () {
      const params = getParamsFromFilter(rangeFilter);
      expect(params.range).to.eql({ from: 0, to: 10 });
    });

    it('should return undefined for exists filter', function () {
      const params = getParamsFromFilter(existsFilter);
      expect(params.exists).to.not.be.ok();
    });
  });

  describe('getFieldOptions', function () {
    it('returns an empty array when no index patterns are provided', function () {
      const fieldOptions = getFieldOptions();
      expect(fieldOptions).to.eql([]);
    });

    it('returns the list of fields from the given index patterns', function () {
      const fieldOptions = getFieldOptions([indexPattern]);
      expect(fieldOptions).to.be.an('array');
      expect(fieldOptions.length).to.be.greaterThan(0);
    });

    it('limits the fields to the filterable fields', function () {
      const fieldOptions = getFieldOptions([indexPattern]);
      const nonFilterableFields = fieldOptions.filter(field => !field.filterable);
      expect(nonFilterableFields.length).to.be(0);
    });
  });

  describe('getOperatorOptions', function () {
    it('returns range for number fields', function () {
      const field = fields.find(field => field.type === 'number');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find(operator => operator.type === 'range');
      expect(rangeOperator).to.be.ok();
    });

    it('does not return range for string fields', function () {
      const field = fields.find(field => field.type === 'string');
      const operatorOptions = getOperatorOptions(field);
      const rangeOperator = operatorOptions.find(operator => operator.type === 'range');
      expect(rangeOperator).to.not.be.ok();
    });

    it('returns operators without field type restrictions', function () {
      const operatorOptions = getOperatorOptions();
      const operatorsWithoutFieldTypes = FILTER_OPERATORS.filter(operator => !operator.fieldTypes);
      expect(operatorOptions.length).to.be(operatorsWithoutFieldTypes.length);
    });
  });

  describe('isFilterValid', function () {
    it('should return false if field is not provided', function () {
      const field = null;
      const operator = FILTER_OPERATORS[0];
      const params = { phrase: 'foo' };
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.not.be.ok();
    });

    it('should return false if operator is not provided', function () {
      const field = fields[0];
      const operator = null;
      const params = { phrase: 'foo' };
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.not.be.ok();
    });

    it('should return false for phrase filter without phrase', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'phrase');
      const params = {};
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.not.be.ok();
    });

    it('should return true for phrase filter with phrase', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'phrase');
      const params = { phrase: 'foo' };
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.be.ok();
    });

    it('should return false for phrases filter without phrases', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'phrases');
      const params = {};
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.not.be.ok();
    });

    it('should return true for phrases filter with phrases', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'phrases');
      const params = { phrases: ['foo', 'bar'] };
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.be.ok();
    });

    it('should return false for range filter without range', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'range');
      const params = {};
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.not.be.ok();
    });

    it('should return true for range filter with from', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'range');
      const params = { range: { from: 0 } };
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.be.ok();
    });

    it('should return true for range filter with from/to', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'range');
      const params = { range: { from: 0, to: 10 } };
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.be.ok();
    });

    it('should return true for exists filter without params', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'exists');
      const params = {};
      const isValid = isFilterValid({ field, operator, params });
      expect(isValid).to.be.ok();
    });
  });

  describe('buildFilter', function () {
    let filterBuilder;
    beforeEach(function () {
      filterBuilder = {
        buildExistsFilter: sinon.stub().returns(existsFilter),
        buildPhraseFilter: sinon.stub().returns(phraseFilter),
        buildPhrasesFilter: sinon.stub().returns(phrasesFilter),
        buildRangeFilter: sinon.stub().returns(rangeFilter)
      };
    });

    it('should build phrase filters', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'phrase');
      const params = { phrase: 'foo' };
      const filter = buildFilter({ indexPattern, field, operator, params, filterBuilder });
      expect(filter).to.be.ok();
      expect(filter.meta.negate).to.be(operator.negate);
      expect(filterBuilder.buildPhraseFilter.called).to.be.ok();
      expect(filterBuilder.buildPhraseFilter.getCall(0).args[1]).to.be(params.phrase);
    });

    it('should build phrases filters', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'phrases');
      const params = { phrases: ['foo', 'bar'] };
      const filter = buildFilter({ indexPattern, field, operator, params, filterBuilder });
      expect(filter).to.be.ok();
      expect(filter.meta.negate).to.be(operator.negate);
      expect(filterBuilder.buildPhrasesFilter.called).to.be.ok();
      expect(filterBuilder.buildPhrasesFilter.getCall(0).args[1]).to.eql(params.phrases);
    });

    it('should build range filters', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'range');
      const params = { range: { from: 0, to: 10 } };
      const filter = buildFilter({ indexPattern, field, operator, params, filterBuilder });
      expect(filter).to.be.ok();
      expect(filter.meta.negate).to.be(operator.negate);
      expect(filterBuilder.buildRangeFilter.called).to.be.ok();
      const range = filterBuilder.buildRangeFilter.getCall(0).args[1];
      expect(range).to.have.property('gte');
      expect(range).to.have.property('lt');
    });

    it('should build exists filters', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'exists');
      const params = {};
      const filter = buildFilter({ indexPattern, field, operator, params, filterBuilder });
      expect(filter).to.be.ok();
      expect(filter.meta.negate).to.be(operator.negate);
      expect(filterBuilder.buildExistsFilter.called).to.be.ok();
    });

    it('should negate based on operator', function () {
      const field = fields[0];
      const operator = FILTER_OPERATORS.find(operator => operator.type === 'exists' && operator.negate);
      const params = {};
      const filter = buildFilter({ indexPattern, field, operator, params, filterBuilder });
      expect(filter).to.be.ok();
      expect(filter.meta.negate).to.be(operator.negate);
      expect(filterBuilder.buildExistsFilter.called).to.be.ok();
    });
  });
});
