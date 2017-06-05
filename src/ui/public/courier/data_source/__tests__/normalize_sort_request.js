import 'ui/private';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { NormalizeSortRequestProvider } from 'ui/courier/data_source/_normalize_sort_request';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import _ from 'lodash';

describe('SearchSource#normalizeSortRequest', function () {
  let normalizeSortRequest;
  let indexPattern;
  let normalizedSort;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    normalizeSortRequest = Private(NormalizeSortRequestProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    normalizedSort = [{
      someField: {
        order: 'desc',
        unmapped_type: 'boolean'
      }
    }];
  }));

  it('should return an array', function () {
    const sortable = { someField: 'desc' };
    const result = normalizeSortRequest(sortable, indexPattern);
    expect(result).to.be.an(Array);
    expect(result).to.eql(normalizedSort);
    // ensure object passed in is not mutated
    expect(result[0]).to.not.be.equal(sortable);
    expect(sortable).to.eql({ someField: 'desc' });
  });

  it('should make plain string sort into the more verbose format', function () {
    const result = normalizeSortRequest([{ someField: 'desc' }], indexPattern);
    expect(result).to.eql(normalizedSort);
  });

  it('should append default sort options', function () {
    const sortState = [{
      someField: {
        order: 'desc',
        unmapped_type: 'boolean'
      }
    }];
    const result = normalizeSortRequest(sortState, indexPattern);
    expect(result).to.eql(normalizedSort);
  });

  it('should enable script based sorting', function () {
    const fieldName = 'script string';
    const direction = 'desc';
    const indexField = indexPattern.fields.byName[fieldName];

    const sortState = {};
    sortState[fieldName] = direction;
    normalizedSort = {
      _script: {
        script: {
          inline: indexField.script,
          lang: indexField.lang
        },
        type: indexField.type,
        order: direction
      }
    };

    let result = normalizeSortRequest(sortState, indexPattern);
    expect(result).to.eql([normalizedSort]);

    sortState[fieldName] = { order: direction };
    result = normalizeSortRequest([sortState], indexPattern);
    expect(result).to.eql([normalizedSort]);
  });

  it('should use script based sorting only on sortable types', function () {
    const fieldName = 'script murmur3';
    const direction = 'asc';

    const sortState = {};
    sortState[fieldName] = direction;
    normalizedSort = {};
    normalizedSort[fieldName] = {
      order: direction,
      unmapped_type: 'boolean'
    };
    const result = normalizeSortRequest([sortState], indexPattern);

    expect(result).to.eql([normalizedSort]);
  });

  it('should remove unmapped_type parameter from _score sorting', function () {
    const sortable = { _score: 'desc' };
    const expected = [{
      _score: {
        order: 'desc'
      }
    }];

    const result = normalizeSortRequest(sortable, indexPattern);
    expect(_.isEqual(result, expected)).to.be.ok();

  });
});
