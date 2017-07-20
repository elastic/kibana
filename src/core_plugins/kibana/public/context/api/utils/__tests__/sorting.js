import expect from 'expect.js';

import {
  reverseSortDirection,
  reverseSortDirective
} from 'plugins/kibana/context/api/utils/sorting';


describe('context app', function () {
  describe('function reverseSortDirection', function () {
    it('should reverse a direction given as a string', function () {
      expect(reverseSortDirection('asc')).to.eql('desc');
      expect(reverseSortDirection('desc')).to.eql('asc');
    });

    it('should reverse a direction given in an option object', function () {
      expect(reverseSortDirection({ order: 'asc' })).to.eql({ order: 'desc' });
      expect(reverseSortDirection({ order: 'desc' })).to.eql({ order: 'asc' });
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
      expect(reverseSortDirective('_score')).to.eql({ _score: 'asc' });
    });

    it('should return direction `desc` when given just a field name', function () {
      expect(reverseSortDirective('field1')).to.eql({ field1: 'desc' });
    });

    it('should reverse direction when given an object', function () {
      expect(reverseSortDirective({ field1: 'asc' })).to.eql({ field1: 'desc' });
    });
  });
});
