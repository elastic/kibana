import { expect } from 'chai';
import getSiblingAggValue from '../../helpers/get_sibling_agg_value';

describe('getSiblingAggValue', () => {
  const row = {
    test: {
      max: 3,
      std_deviation: 1.5,
      std_deviation_bounds: {
        upper: 2,
        lower: 1
      }
    }
  };

  it('returns the value for std_deviation_bounds.upper', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'upper' };
    expect(getSiblingAggValue(row, metric)).to.equal(2);
  });

  it('returns the value for std_deviation_bounds.lower', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'lower' };
    expect(getSiblingAggValue(row, metric)).to.equal(1);
  });

  it('returns the value for std_deviation', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'raw' };
    expect(getSiblingAggValue(row, metric)).to.equal(1.5);
  });

  it('returns the value for basic (max)', () => {
    const metric = { id: 'test', type: 'max_bucket' };
    expect(getSiblingAggValue(row, metric)).to.equal(3);
  });

});
