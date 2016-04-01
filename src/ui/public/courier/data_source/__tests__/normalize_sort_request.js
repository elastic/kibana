
describe('SearchSource#normalizeSortRequest', function () {
  require('ui/private');

  let ngMock = require('ngMock');
  let expect = require('expect.js');

  let normalizeSortRequest;
  let indexPattern;
  let normalizedSort;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    normalizeSortRequest = Private(require('ui/courier/data_source/_normalize_sort_request'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

    normalizedSort = [{
      someField: {
        order: 'desc',
        unmapped_type: 'boolean'
      }
    }];
  }));

  it('should return an array', function () {
    let sortable = { someField: 'desc'};
    let result = normalizeSortRequest(sortable, indexPattern);
    expect(result).to.be.an(Array);
    expect(result).to.eql(normalizedSort);
    // ensure object passed in is not mutated
    expect(result[0]).to.not.be.equal(sortable);
    expect(sortable).to.eql({ someField: 'desc'});
  });

  it('should make plain string sort into the more verbose format', function () {
    let result = normalizeSortRequest([{ someField: 'desc'}], indexPattern);
    expect(result).to.eql(normalizedSort);
  });

  it('should append default sort options', function () {
    let sortState = [{
      someField: {
        order: 'desc',
        unmapped_type: 'boolean'
      }
    }];
    let result = normalizeSortRequest(sortState, indexPattern);
    expect(result).to.eql(normalizedSort);
  });

  it('should enable script based sorting', function () {
    let fieldName = 'script string';
    let direction = 'desc';
    let indexField = indexPattern.fields.byName[fieldName];

    let sortState = {};
    sortState[fieldName] = direction;
    normalizedSort = {
      _script: {
        script: indexField.script,
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
    let fieldName = 'script murmur3';
    let direction = 'asc';
    let indexField = indexPattern.fields.byName[fieldName];

    let sortState = {};
    sortState[fieldName] = direction;
    normalizedSort = {};
    normalizedSort[fieldName] = {
      order: direction,
      unmapped_type: 'boolean'
    };
    let result = normalizeSortRequest([sortState], indexPattern);

    expect(result).to.eql([normalizedSort]);
  });
});
