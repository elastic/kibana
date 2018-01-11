import { expect } from 'chai';
import { createOptions, isBasicAgg } from '../agg_lookup';

describe('aggLookup', () => {

  describe('isBasicAgg(metric)', () => {
    it('returns true for a basic metric (count)', () => {
      expect(isBasicAgg({ type: 'count' })).to.equal(true);
    });
    it('returns false for a pipeline metric (derivative)', () => {
      expect(isBasicAgg({ type: 'derivative' })).to.equal(false);
    });
  });

  describe('createOptions(type, siblings)', () => {

    it('returns options for all aggs', () => {
      const options = createOptions();
      expect(options).to.have.length(28);
      options.forEach((option) => {
        expect(option).to.have.property('label');
        expect(option).to.have.property('value');
        expect(option).to.have.property('disabled');
      });
    });

    it('returns options for basic', () => {
      const options = createOptions('basic');
      expect(options).to.have.length(14);
      expect(options.every(opt => isBasicAgg({ type: opt.value }))).to.equal(true);
    });

    it('returns options for pipeline', () => {
      const options = createOptions('pipeline');
      expect(options).to.have.length(14);
      expect(options.every(opt => !isBasicAgg({ type: opt.value }))).to.equal(true);
    });

    it('returns options for all if given unknown key', () => {
      const options = createOptions('foo');
      expect(options).to.have.length(28);
    });

  });
});
