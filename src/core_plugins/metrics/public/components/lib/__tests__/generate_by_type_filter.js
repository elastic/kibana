import generateByTypeFilter from '../generate_by_type_filter';
import { expect } from 'chai';

describe('generateByTypeFilter()', () => {

  describe('numeric', () => {
    const fn = generateByTypeFilter('numeric');
    [
      'number'
    ].forEach((type) => {
      it(`should return true for ${type}`, () => expect(fn({ type })).to.equal(true));
    });
  });

  describe('string', () => {
    const fn = generateByTypeFilter('string');
    ['string', 'keyword', 'text'].forEach((type) => {
      it(`should return true for ${type}`, () => expect(fn({ type })).to.equal(true));
    });
  });

  describe('date', () => {
    const fn = generateByTypeFilter('date');
    ['date'].forEach((type) => {
      it(`should return true for ${type}`, () => expect(fn({ type })).to.equal(true));
    });
  });

  describe('all', () => {
    const fn = generateByTypeFilter('all');
    [
      'number',
      'string',
      'text',
      'keyword',
      'date',
      'whatever'
    ].forEach((type) => {
      it(`should return true for ${type}`, () => expect(fn({ type })).to.equal(true));
    });
  });

});
