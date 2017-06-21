/**
 * Created by itzhak on 6/19/2017.
 */

import expect from 'expect.js';

import {
  getFieldValueObject, makeFiltersBoolean, isRemoveFilter,isCtrlKeyPressed
} from '../multiselect';

describe('multiselect functions', function () {
  let filters;
  beforeEach(function () {
    filters = [
      {
        query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      },
      {
        range: { Azimuth: { 'gte': 0, 'lt': 1000 } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'nginx', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'ngg', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: true, disabled: false }
      }
    ];
  });
  describe('function getFieldValueObject', function () {

    it('should disable a filter that is explicitly enabled', function () {
      let res = getFieldValueObject(filters[0]);
      expect(res.field).to.be('extension');
      expect(res.value).to.be('jpg');
      res = getFieldValueObject(filters[1]);
      expect(res.field).to.be('Azimuth');
      expect(res.value.lt).to.be(1000);
    });


  });

  describe('function makeFiltersBoolean', function () {
    it('should return object with all properties', function () {
      const res = makeFiltersBoolean(filters);
      expect(res).to.have.property('query');
      expect(res).to.have.property('meta');
      expect(res.query).to.have.property('bool');
      expect(res.query.bool).to.have.property('should');
      expect(res.query.bool).to.have.property('must_not');
      expect(res.meta).to.have.property('alias');

    });
    it('multiselect terms with negate=flase should return bool query with all values', function () {
      const partialFilters = [filters[0], filters[2]];
      const res = makeFiltersBoolean(partialFilters);
      expect(res.query.bool.should.length).to.be(2);
      expect(res.query.bool.should[0]).to.eql({
        match: { extension: { query: 'jpg', type: 'phrase' } }
      });
      expect(res.query.bool.should[1]).to.eql({
        match: { '_type': { query: 'nginx', type: 'phrase' } }
      });
    });

    it('multiselect terms with negate=flase and negate=true should return bool query with all values', function () {
      const partialFilters = [filters[0], filters[3]];
      const res = makeFiltersBoolean(partialFilters);
      expect(res.query.bool.should.length).to.be(1);
      expect(res.query.bool.must_not.length).to.be(1);

      expect(res.query.bool.should[0]).to.eql({
        match: { extension: { query: 'jpg', type: 'phrase' } }
      });
      expect(res.query.bool.must_not[0]).to.eql({
        match: { '_type': { query: 'ngg', type: 'phrase' } }
      });
    });

    it('should return right filter alias', function () {
      let partialFilters = [filters[0], filters[2]];
      let res = makeFiltersBoolean(partialFilters);
      expect(res.meta.alias).to.be('jpg||nginx');
      partialFilters = [filters[0], filters[3]];
      res = makeFiltersBoolean(partialFilters);
      expect(res.meta.alias).to.be('jpg!ngg');

    });

  });

  describe('function isRemoveFilter', function () {
    it('should return true', function () {
      let res = isRemoveFilter(filters, filters[0]);
      expect(res).to.be(true);
      res = isRemoveFilter(filters, filters[1]);
      expect(res).to.be(true);
    });
    it('should return false', function () {
      const currentFilter = {
        query: { match: { extension: { query: 'png', type: 'phrase' } } },
        meta: { index: 'logstash-*', negate: false, disabled: false }
      };
      const res = isRemoveFilter(filters, currentFilter);
      expect(res).to.be(false);

    });


  });

  describe('function isCtrlKeyPressed', function () {
    it('should return true because ctrl key pressed', function () {
      let res = isCtrlKeyPressed({ ctrlKey:true });
      expect(res).to.be(true);
      res = isCtrlKeyPressed({ keyCode:17 });
      expect(res).to.be(true);
    });

    it('should return false because CtrlKey not pressed', function () {
      const res = isCtrlKeyPressed({ });
      expect(res).to.be(false);
    });

  });


});




