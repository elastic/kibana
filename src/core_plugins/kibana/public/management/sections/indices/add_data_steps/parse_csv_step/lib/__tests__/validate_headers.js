import validateHeaders from '../validate_headers';
import expect from 'expect.js';

describe('validateHeaders', function () {

  describe('basic validations', function () {

    it('should return empty array if fields are valid', function () {
      const errors = validateHeaders(['aa', 'bb', 'cc', 'dd', 'ee']);
      expect(errors).to.eql([]);
    });

    it('should return empty array if it contains white space field name', function () {
      const errors = validateHeaders(['aa', 'bb', '  ', ' ', 'ee']);
      expect(errors.length).to.be(0);
    });

    it('should return an error if contains blank field name', function () {
      const errors = validateHeaders(['aa', 'bb', 'cc', '', 'ee']);
      expect(errors.length).to.be(1);
      expect(errors[0]).eql({ type: 'blank', positions: [4] });
    });

    it('should return an error if fields contain duplicate field name', function () {
      const errors = validateHeaders(['aa', 'bb', 'cc', 'dd', 'aa']);
      expect(errors.length).to.be(1);
      expect(errors[0]).eql({ type: 'duplicate', positions: [1, 5], fieldName: 'aa' });
    });

    it('should return multiple errors if fields contain duplicate and blank field name', function () {
      const errors = validateHeaders(['aa', 'bb', '', 'dd', 'aa', '', 'aa', 'dd', 'hh']);
      expect(errors.length).to.be(3);
      expect(errors[0]).eql({ type: 'duplicate', positions: [1, 5, 7], fieldName: 'aa' });
      expect(errors[1]).eql({ type: 'blank', positions: [3, 6] });
      expect(errors[2]).eql({ type: 'duplicate', positions: [4, 8], fieldName: 'dd' });
    });
  });

});
