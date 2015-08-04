var getSort = require('ui/doc_table/lib/get_sort');
var defaultSort = {time: 'desc'};
var expect = require('expect.js');
var ngMock = require('ngMock');
var indexPattern;

describe('docTable', function () {
  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (Private, _$rootScope_, Promise) {
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
  }));

  describe('getSort function', function () {
    it('should be a function', function () {
      expect(getSort).to.be.a(Function);
    });

    it('should return an object if passed a 2 item array', function () {
      expect(getSort(['bytes', 'desc'], indexPattern)).to.eql({bytes: 'desc'});

      delete indexPattern.timeFieldName;
      expect(getSort(['bytes', 'desc'], indexPattern)).to.eql({bytes: 'desc'});
    });

    it('should sort by the default when passed an unsortable field', function () {
      expect(getSort(['_id', 'asc'], indexPattern)).to.eql(defaultSort);
      expect(getSort(['lol_nope', 'asc'], indexPattern)).to.eql(defaultSort);

      delete indexPattern.timeFieldName;
      expect(getSort(['_id', 'asc'], indexPattern)).to.eql({_score: 'desc'});
    });

    it('should sort in reverse chrono order otherwise on time based patterns', function () {
      expect(getSort([], indexPattern)).to.eql(defaultSort);
      expect(getSort(['foo'], indexPattern)).to.eql(defaultSort);
      expect(getSort({foo: 'bar'}, indexPattern)).to.eql(defaultSort);
    });

    it('should sort by score on non-time patterns', function () {
      delete indexPattern.timeFieldName;

      expect(getSort([], indexPattern)).to.eql({_score: 'desc'});
      expect(getSort(['foo'], indexPattern)).to.eql({_score: 'desc'});
      expect(getSort({foo: 'bar'}, indexPattern)).to.eql({_score: 'desc'});
    });
  });

  describe('getSort.array function', function () {
    it('should have an array method', function () {
      expect(getSort.array).to.be.a(Function);
    });

    it('should return an array for sortable fields', function () {
      expect(getSort.array(['bytes', 'desc'], indexPattern)).to.eql([ 'bytes', 'desc' ]);
    });
  });
});
