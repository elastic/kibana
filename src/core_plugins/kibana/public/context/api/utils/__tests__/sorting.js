import { expect } from 'chai';

import {
  reverseQuerySort,
  reverseSortDirection,
  reverseSortDirective
} from 'plugins/kibana/context/api/utils/sorting';


describe('context app', function () {
  describe('function reverseQuerySort', function () {
    it('should reverse all the `sort` property values', function () {
      expect(reverseQuerySort({
        sort: [
          { field1: { order: 'desc', mode: 'max' } },
          { field2: 'asc' },
          'field3',
          '_score',
        ],
      })).to.deep.equal({
        sort: [
          { field1: { order: 'asc', mode: 'max' } },
          { field2: 'desc' },
          { field3: 'desc' },
          { _score: 'asc' },
        ],
      });
    });
  });

  describe('function reverseSortDirection', function () {
    it('should reverse a direction given as a string', function () {
      expect(reverseSortDirection('asc')).to.equal('desc');
      expect(reverseSortDirection('desc')).to.equal('asc');
    });

    it('should reverse a direction given in an option object', function () {
      expect(reverseSortDirection({ order: 'asc' })).to.deep.equal({ order: 'desc' });
      expect(reverseSortDirection({ order: 'desc' })).to.deep.equal({ order: 'asc' });
    });

    it('should preserve other properties than `order` in an option object', function () {
      expect(reverseSortDirection({
        order: 'asc',
        other: 'field',
      })).to.have.property('other', 'field');
    });
  });

  describe('function reverseSortDirective', function () {
    it('should return direction `asc` when given just `_score`', function () {
      expect(reverseSortDirective('_score')).to.deep.equal({ _score: 'asc' });
    });

    it('should return direction `desc` when given just a field name', function () {
      expect(reverseSortDirective('field1')).to.deep.equal({ field1: 'desc' });
    });

    it('should reverse direction when given an object', function () {
      expect(reverseSortDirective({ field1: 'asc' })).to.deep.equal({ field1: 'desc' });
    });
  });
});
