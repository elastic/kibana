
describe('SearchSource#normalizeSortRequest', function () {
  require('ui/private');

  var ngMock = require('ngMock');
  var expect = require('expect.js');

  var normalizeSortRequest;
  var indexPattern;
  var normalizedSort;

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
    var sortable = { someField: 'desc'};
    var result = normalizeSortRequest(sortable, indexPattern);
    expect(result).to.be.an(Array);
    expect(result).to.eql(normalizedSort);
    // ensure object passed in is not mutated
    expect(result[0]).to.not.be.equal(sortable);
    expect(sortable).to.eql({ someField: 'desc'});
  });

  it('should make plain string sort into the more verbose format', function () {
    var result = normalizeSortRequest([{ someField: 'desc'}], indexPattern);
    expect(result).to.eql(normalizedSort);
  });

  it('should append default sort options', function () {
    var sortState = [{
      someField: {
        order: 'desc',
        unmapped_type: 'boolean'
      }
    }];
    var result = normalizeSortRequest(sortState, indexPattern);
    expect(result).to.eql(normalizedSort);
  });

  it('should enable script based sorting', function () {
    var fieldName = 'script string';
    var direction = 'desc';
    var indexField = indexPattern.fields.byName[fieldName];

    var sortState = {};
    sortState[fieldName] = direction;
    normalizedSort = {
      _script: {
        script: indexField.script,
        type: indexField.type,
        order: direction
      }
    };

    var result = normalizeSortRequest(sortState, indexPattern);
    expect(result).to.eql([normalizedSort]);

    sortState[fieldName] = { order: direction };
    result = normalizeSortRequest([sortState], indexPattern);
    expect(result).to.eql([normalizedSort]);
  });

  it('should use script based sorting only on sortable types', function () {
    var fieldName = 'script murmur3';
    var direction = 'asc';
    var indexField = indexPattern.fields.byName[fieldName];

    var sortState = {};
    sortState[fieldName] = direction;
    normalizedSort = {};
    normalizedSort[fieldName] = {
      order: direction,
      unmapped_type: 'boolean'
    };
    var result = normalizeSortRequest([sortState], indexPattern);

    expect(result).to.eql([normalizedSort]);
  });
});
